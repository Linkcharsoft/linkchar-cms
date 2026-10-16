'use client'
import './PageFields.sass'
import { useFormikContext } from 'formik'
import { classNames } from 'primereact/utils'
import { use, useCallback, useEffect, useRef, useState } from 'react'
import { HIDDEN_KEY } from '../../../core/fields'
import { sameContent } from '../../../core/merge'
import { countBySection, pageSections, sectionSummary, usedEntries } from '../../../core/pages'
import { useCms, usePaths, useT } from '../../client/context'
import { EntryContext } from '../../fields/entryContext'
import { useText } from '../../fields/fieldUtils'
import { FormFocusContext } from '../../fields/formFocusContext'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import CmsField from '../CmsField/CmsField'
import CmsFields from '../CmsFields/CmsFields'
import PageOutline from '../PageOutline/PageOutline'
import PageSection from '../PageSection/PageSection'
import SeoPreview from '../SeoPreview/SeoPreview'
import type { FieldsRecord } from '../../../core/fields'
import type { PageSectionType } from '../../../core/pages'

type DataRecord = Record<string, unknown>

interface Props {
  fields: FieldsRecord
  // Published content, to mark what changed; null while the page was never published.
  published: DataRecord | null
  // Paths that still block publishing.
  missingPaths: string[]
  remounts: Record<string, number>
  // Narrow layout (preview open): the outline collapses into a select.
  compact: boolean
  // Site anchor of the section on screen, for the preview.
  onAnchorChange: (anchor: string | null) => void
  // Offered on sections that differ from what's published.
  onDiscardSection?: (key: string) => void
}

const elementOf = (key: string) => document.getElementById(`section-${key}`)

const withoutHidden = (fields: FieldsRecord): FieldsRecord =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => key !== HIDDEN_KEY))

const SectionBody = ({ section }: { section: PageSectionType }) => {
  const text = useText()
  const { field, key } = section
  if (field.kind !== 'group') return <CmsField name={key} field={field} />

  return (
    <>
      {field.help && <p className='PageFields__Help'>{text(field.help)}</p>}
      <CmsFields fields={withoutHidden(field.fields)} prefix={`${key}.`} />
      {field.seo && <SeoPreview name={key} mark={field.seo} />}
    </>
  )
}

// A page as stacked, collapsible sections in site order, with an outline of what's missing and what changed.
const PageFields = ({ fields, published, missingPaths, remounts, compact, onAnchorChange, onDiscardSection }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const paths = usePaths()
  const text = useText()
  const { locale } = use(EntryContext)
  const { values, errors } = useFormikContext<DataRecord>()
  const sections = pageSections(fields)
  const [open, setOpen] = useState<Record<string, boolean>>(() => (sections[0] ? { [sections[0].key]: true } : {}))
  const [active, setActive] = useState<string | null>(null)
  const missing = countBySection(missingPaths)

  // A jump from the outline wins over the scroll tracking until the smooth scroll settles.
  const jumping = useRef(0)

  const toggle = useCallback((key: string, next: boolean) => setOpen(current => ({ ...current, [key]: next })), [])

  const usesOf = (section: PageSectionType) =>
    usedEntries(config, [section]).map(used => ({ label: text(used.label), href: paths.entry(used.kind, used.id) }))

  const select = (key: string) => {
    toggle(key, true)
    setActive(key)
    jumping.current = Date.now() + 1000
    window.history.replaceState(null, '', `${window.location.search}#${key}`)
    requestAnimationFrame(() => elementOf(key)?.scrollIntoView({ block: 'start' }))
  }

  // Deep links (from Publish, Activity…) open their section.
  useEffect(() => {
    const key = decodeURIComponent(window.location.hash.slice(1))
    if (key && sections.some(section => section.key === key)) select(key)
  // Only on load.
  }, [])

  const { reveal } = use(FormFocusContext)
  useEffect(() => {
    const key = reveal?.path.split('.')[0]
    if (key && sections.some(section => section.key === key)) select(key)
  // Only when a new reveal arrives.
  }, [reveal?.nonce])

  const errorKeys = Object.keys(errors).join()
  useEffect(() => {
    if (errorKeys) setOpen(current => ({ ...current, ...Object.fromEntries(errorKeys.split(',').map(key => [key, true])) }))
  }, [errorKeys])

  // The section nearest the top of the screen is the one being edited.
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0] && Date.now() > jumping.current) setActive(visible[0].target.id.replace(/^section-/, ''))
    }, { rootMargin: '-120px 0px -60% 0px' })
    for (const { key } of sections) {
      const element = elementOf(key)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [sections.length])

  useEffect(() => {
    const anchor = sections.find(section => section.key === active)?.mark?.anchor
    if (anchor) onAnchorChange(anchor)
  // Sections come from the schema and never change while editing.
  }, [active, onAnchorChange])

  const items = sections.map(section => ({
    key: section.key,
    label: text(section.label),
    icon: section.mark?.icon,
    changed: !!published && !sameContent(values[section.key], published[section.key]),
    missing: missing[section.key] ?? 0,
    hidden: !!section.mark?.hideable && (values[section.key] as DataRecord | undefined)?.[HIDDEN_KEY] === true
  }))

  return (
    <div className={classNames('PageFields', { 'PageFields--Compact': compact })}>
      <PageOutline items={items} active={active} onSelect={select} />

      <div className='PageFields__Sections' onFocus={event => {
        const section = (event.target as HTMLElement).closest('.PageSection')
        if (section) setActive(section.id.replace(/^section-/, ''))
      }}
      >
        {sections.map((section, index) => (
          <PageSection
            key={`${section.key}:${remounts[section.key] ?? 0}`}
            sectionKey={section.key}
            label={items[index].label}
            icon={section.mark?.icon}
            summary={sectionSummary(values[section.key], locale)}
            open={!!open[section.key]}
            onToggle={next => toggle(section.key, next)}
            hideable={!!section.mark?.hideable}
            changed={items[index].changed}
            missing={items[index].missing}
            uses={usesOf(section)}
            actions={onDiscardSection && items[index].changed && (
              <CustomButton type='button' variant='ghost' size='xs' onClick={() => onDiscardSection(section.key)}>
                <i className='pi pi-undo' aria-hidden='true' />
                {t('editor.page.backToPublished')}
              </CustomButton>
            )}
          >
            <SectionBody section={section} />
          </PageSection>
        ))}
      </div>
    </div>
  )
}

export default PageFields
