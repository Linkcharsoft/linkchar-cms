'use client'
import './PageSection.sass'
import { useField } from 'formik'
import Link from 'next/link'
import { InputSwitch } from 'primereact/inputswitch'
import { classNames } from 'primereact/utils'
import { Fragment, useEffect, useRef } from 'react'
import { HIDDEN_KEY } from '../../../core/fields'
import { useCms, useT } from '../../client/context'
import Notice from '../../primitives/Notice/Notice'
import LocaleCounts, { totalMissing } from '../LocaleCounts/LocaleCounts'
import type { Route } from 'next'
import type { ReactNode } from 'react'

interface Props {
  sectionKey: string
  label: string
  icon?: string
  // One line that identifies the section while it's closed (usually its title).
  summary: string
  open: boolean
  onToggle: (open: boolean) => void
  hideable: boolean
  changed: boolean
  // Missing items per locale.
  missing: Record<string, number>
  // Entries edited elsewhere whose content this section also shows.
  uses: { label: string, href: string }[]
  actions?: ReactNode
  children: ReactNode
}

const HiddenSwitch = ({ name, id }: { name: string, id: string }) => {
  const { t } = useT()
  const [{ value }, , { setValue }] = useField<boolean>(name)

  return (
    <div className='PageSection__Switch'>
      <InputSwitch inputId={id} checked={!value} onChange={event => setValue(!event.value)} />
      <label htmlFor={id} className='PageSection__SwitchLabel'>{t('editor.document.showOnSite')}</label>
    </div>
  )
}

const PageSection = ({ sectionKey, label, icon, summary, open, onToggle, hideable, changed, missing, uses, actions, children }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const [{ value: hidden }] = useField<boolean | undefined>(`${sectionKey}.${HIDDEN_KEY}`)
  const body = useRef<HTMLDivElement>(null)
  const id = `section-${sectionKey}`

  // Closed bodies stay searchable: Ctrl+F finds their text and the browser asks to open them.
  useEffect(() => {
    const element = body.current
    if (!element) return
    if (!open) element.setAttribute('hidden', 'until-found')
    const reveal = () => onToggle(true)
    element.addEventListener('beforematch', reveal)
    return () => element.removeEventListener('beforematch', reveal)
  }, [open, onToggle])

  return (
    <section id={id} className={classNames('PageSection', { 'PageSection--Open': open, 'PageSection--Hidden': hideable && hidden })}>
      <div className='PageSection__Header'>
        <h2 className='PageSection__Heading'>
          <button
            type='button'
            className='PageSection__Toggle'
            aria-expanded={open}
            aria-controls={`${id}-body`}
            onClick={() => onToggle(!open)}
          >
            <i className={`pi ${icon ?? 'pi-file'} PageSection__Icon`} aria-hidden='true' />
            <span className='PageSection__Text'>
              <span className='PageSection__Title'>{label}</span>
              {!open && summary && <span className='PageSection__Summary'>{summary}</span>}
            </span>
            {totalMissing(missing) > 0 && (
              <span className='PageSection__Mark PageSection__Mark--Missing'>
                {t('editor.page.missing')}
                {config.locales.length > 1 && <LocaleCounts counts={missing} />}
              </span>
            )}
            {changed && <span className='PageSection__Mark PageSection__Mark--Changed'>{t('editor.page.changed')}</span>}
            {hideable && hidden && <span className='PageSection__Mark'>{t('editor.page.hidden')}</span>}
            <i className={`pi ${open ? 'pi-chevron-up' : 'pi-chevron-down'} PageSection__Chevron`} aria-hidden='true' />
          </button>
        </h2>
        {(hideable || actions) && (
          <div className='PageSection__Actions'>
            {hideable && <HiddenSwitch name={`${sectionKey}.${HIDDEN_KEY}`} id={`${id}-visible`} />}
            {actions}
          </div>
        )}
      </div>

      <div ref={body} id={`${id}-body`} className='PageSection__Body' hidden={!open}>
        {hideable && hidden && <Notice>{t('editor.page.hiddenNotice')}</Notice>}
        {uses.length > 0 && (
          <p className='PageSection__Uses'>
            <i className='pi pi-link' aria-hidden='true' />
            <span>
              {t('editor.page.usesBefore')}
              {uses.map((use, index) => (
                <Fragment key={use.href}>
                  {index > 0 && (index === uses.length - 1 ? t('editor.page.and') : ', ')}
                  <Link href={use.href as Route} className='PageSection__UsesLink'>{use.label}</Link>
                </Fragment>
              ))}
              {t('editor.page.usesAfter')}
            </span>
          </p>
        )}
        {children}
      </div>
    </section>
  )
}

export default PageSection
