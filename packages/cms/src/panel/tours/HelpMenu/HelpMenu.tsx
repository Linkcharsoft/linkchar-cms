'use client'
import 'driver.js/dist/driver.css'
import './HelpMenu.sass'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from 'primereact/menu'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useCms, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import { useNotify } from '../../providers/notify'
import { isEditing } from '../focus'
import { buildTours, tourAnchor, tourForPath, tourProgress } from '../tours'
import type { TourType } from '../tours'
import type { DriveStep } from 'driver.js'
import type { Route } from 'next'
import type { MenuItem } from 'primereact/menuitem'

interface Props {
  seenTours: string[]
}

// Gives the screen time to render its data before the first step measures anything.
const START_DELAY = 700

// While a field has the focus, the guide waits and looks again.
const RETRY_DELAY = 1000

// How long a step waits for an anchor that is still loading (the publish history, a list) before it is skipped.
const WAIT_FOR_ANCHOR = 1500

const isOnScreen = (element: Element) => {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

// Looked up when the step shows, never earlier: a re-mounted button (a tooltip that comes and goes) keeps its anchor.
const visibleAnchor = (anchor: string) => {
  const element = document.querySelector(tourAnchor(anchor))
  return element && isOnScreen(element) ? element : null
}

// driver.js skips a step whose element resolves to nothing, but types the resolver as always returning one.
const resolver = (anchor: string) => () => visibleAnchor(anchor) as Element

const toSteps = (tour: TourType): DriveStep[] => tour.steps.map(step => ({
  ...(step.anchor ? { element: resolver(step.anchor) } : {}),
  popover: { title: step.title, description: step.description, side: step.side, align: step.align }
}))

// Anchors missing on this screen (a hidden mobile menu, a section without tabs) are skipped; a tour with none never starts.
const hasSomethingToShow = (tour: TourType) => tour.steps.some(step => !step.anchor || visibleAnchor(step.anchor))

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const HelpMenu = ({ seenTours }: Props) => {
  const { t, translate } = useT()
  const { config, actions } = useCms()
  const pathname = usePathname()
  const router = useRouter()
  const notify = useNotify()
  const menuRef = useRef<Menu>(null)
  const running = useRef(false)
  const observer = useRef<ResizeObserver | null>(null)
  const [seen, setSeen] = useState(() => new Set(seenTours))
  const [requested, setRequested] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const tours = useMemo(() => buildTours(config), [config])
  const current = tourForPath(tours, pathname)

  const start = async (tour: TourType) => {
    if (running.current) return
    running.current = true
    const { driver } = await import('driver.js')
    const instance = driver({
      steps: toSteps(tour),
      skipMissingElement: true,
      waitForElement: WAIT_FOR_ANCHOR,
      animate: !prefersReducedMotion(),
      stagePadding: 4,
      stageRadius: 12,
      showProgress: true,
      // driver.js counts the steps it skips in {{total}}: the footer is rewritten with the ones this screen shows.
      onPopoverRender: (popover, { state }) => {
        const shown = tour.steps.map(step => !step.anchor || !!visibleAnchor(step.anchor))
        popover.progress.innerText = t('help.progress', tourProgress(shown, state.activeIndex ?? 0))
      },
      nextBtnText: t('help.next'),
      prevBtnText: t('help.previous'),
      doneBtnText: t('help.done'),
      closeBtnLabel: t('help.close'),
      popoverClass: 'HelpMenu__Popover',
      // The highlighted element can grow or shrink (an image loads, a list fills): keep the stage on it.
      onHighlighted: element => {
        observer.current?.disconnect()
        if (!element) return
        observer.current = new ResizeObserver(() => instance.refresh())
        observer.current.observe(element)
      },
      onDeselected: () => observer.current?.disconnect(),
      // onDestroyed is skipped when the tour closes mid-animation; this hook always runs.
      onDestroyStarted: () => {
        observer.current?.disconnect()
        instance.destroy()
        running.current = false
        setSeen(previous => new Set(previous).add(tour.id))
        actions.markTourSeen(tour.id)
      }
    })
    instance.drive()
  }

  const startOnArrival = useEffectEvent((tour: TourType) => {
    if (hasSomethingToShow(tour)) void start(tour)
  })

  useEffect(() => {
    const tour = requested
      ? tours.find(item => item.id === requested && item.matches(pathname))
      : current && !seen.has(current.id) ? current : null
    if (!tour) return
    let timer: number
    const attempt = () => {
      if (!requested && isEditing(document.activeElement)) {
        timer = window.setTimeout(attempt, RETRY_DELAY)
        return
      }
      setRequested(null)
      startOnArrival(tour)
    }
    timer = window.setTimeout(attempt, START_DELAY)
    return () => window.clearTimeout(timer)
  }, [pathname, requested, current, seen, tours])

  useEffect(() => () => observer.current?.disconnect(), [])

  const open = (tour: TourType) => {
    if (tour.matches(pathname)) {
      if (!hasSomethingToShow(tour)) return notify({ severity: 'warn', summary: t('help.nothingHere') })
      return start(tour)
    }
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
    ...(current ? [{ label: t('help.thisScreen'), icon: 'pi pi-play', command: () => open(current) }, { separator: true }] : []),
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
        aria-expanded={menuOpen}
        aria-controls='cms-help-menu'
        data-tour='help'
        onClick={event => menuRef.current?.toggle(event)}
      >
        <i className='pi pi-question-circle' aria-hidden='true' />
        <span className='HelpMenu__Label'>{t('help.button')}</span>
      </CustomButton>
      <Menu
        id='cms-help-menu'
        model={items}
        popup
        ref={menuRef}
        className='HelpMenu__Menu'
        onShow={() => setMenuOpen(true)}
        onHide={() => setMenuOpen(false)}
      />
    </>
  )
}

export default HelpMenu
