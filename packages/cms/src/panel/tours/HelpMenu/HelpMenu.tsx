'use client'
import 'driver.js/dist/driver.css'
import './HelpMenu.sass'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from 'primereact/menu'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useCms, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import { useNotify } from '../../providers/notify'
import { buildTours, tourAnchor, tourForPath } from '../tours'
import type { TourType } from '../tours'
import type { DriveStep } from 'driver.js'
import type { Route } from 'next'
import type { MenuItem } from 'primereact/menuitem'

interface Props {
  seenTours: string[]
}

// Gives the screen time to render its data before the first step measures anything.
const START_DELAY = 700

const isOnScreen = (element: Element) => {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

// Anchors missing on this screen (a hidden mobile menu, a section without tabs) are skipped, not shown empty.
const toSteps = (tour: TourType): DriveStep[] => tour.steps.flatMap(step => {
  const popover = { title: step.title, description: step.description }
  if (!step.anchor) return [{ popover }]
  const element = document.querySelector(tourAnchor(step.anchor))
  return element && isOnScreen(element) ? [{ element, popover }] : []
})

const HelpMenu = ({ seenTours }: Props) => {
  const { t, translate } = useT()
  const { config, actions } = useCms()
  const pathname = usePathname()
  const router = useRouter()
  const notify = useNotify()
  const menuRef = useRef<Menu>(null)
  const running = useRef(false)
  const [seen, setSeen] = useState(() => new Set(seenTours))
  const [requested, setRequested] = useState<string | null>(null)
  const tours = useMemo(() => buildTours(config), [config])
  const current = tourForPath(tours, pathname)

  const start = async (tour: TourType) => {
    if (running.current) return
    running.current = true
    const { driver } = await import('driver.js')
    driver({
      steps: toSteps(tour),
      showProgress: true,
      progressText: t('help.progress', { current: '{{current}}', total: '{{total}}' }),
      nextBtnText: t('help.next'),
      prevBtnText: t('help.previous'),
      doneBtnText: t('help.done'),
      popoverClass: 'HelpMenu__Popover',
      // onDestroyed is skipped when the tour closes mid-animation; this hook always runs.
      onDestroyStarted: (_element, _step, { driver: instance }) => {
        instance.destroy()
        running.current = false
        setSeen(previous => new Set(previous).add(tour.id))
        actions.markTourSeen(tour.id)
      }
    }).drive()
  }

  const startOnArrival = useEffectEvent((tour: TourType) => start(tour))

  useEffect(() => {
    const tour = requested
      ? tours.find(item => item.id === requested && item.matches(pathname))
      : current && !seen.has(current.id) ? current : null
    if (!tour) return
    const timer = setTimeout(() => {
      setRequested(null)
      startOnArrival(tour)
    }, START_DELAY)
    return () => clearTimeout(timer)
  }, [pathname, requested, current, seen, tours])

  const open = (tour: TourType) => {
    if (tour.matches(pathname)) return start(tour)
    if (!tour.path) return
    setRequested(tour.id)
    router.push(tour.path as Route)
  }

  const restore = async () => {
    const result = await actions.resetTours()
    if (result.error) return notify({ severity: 'error', summary: translate(result.error) })
    setSeen(new Set())
    notify({ severity: 'success', summary: t('help.resetDone') })
  }

  const items: MenuItem[] = [
    ...(current ? [{ label: t('help.thisScreen'), icon: 'pi pi-play', command: () => start(current) }, { separator: true }] : []),
    {
      label: t('help.tours'),
      items: tours.map(tour => {
        const unavailable = !tour.path && !tour.matches(pathname)
        return {
          label: tour.title,
          icon: seen.has(tour.id) ? 'pi pi-check' : 'pi pi-circle',
          disabled: unavailable,
          title: unavailable ? t('help.openDocument') : undefined,
          command: () => open(tour)
        }
      })
    },
    { separator: true },
    { label: t('help.reset'), icon: 'pi pi-refresh', command: restore }
  ]

  return (
    <>
      <CustomButton
        type='button'
        variant='ghost'
        size='sm'
        aria-haspopup='menu'
        aria-controls='cms-help-menu'
        data-tour='help'
        onClick={event => menuRef.current?.toggle(event)}
      >
        <i className='pi pi-question-circle' aria-hidden='true' />
        <span className='HelpMenu__Label'>{t('help.button')}</span>
      </CustomButton>
      <Menu id='cms-help-menu' model={items} popup ref={menuRef} className='HelpMenu__Menu' />
    </>
  )
}

export default HelpMenu
