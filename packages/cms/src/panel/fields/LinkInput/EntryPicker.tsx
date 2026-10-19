'use client'
import { AutoComplete } from 'primereact/autocomplete'
import { Dropdown } from 'primereact/dropdown'
import { use, useState } from 'react'
import { pageSections } from '../../../core/pages'
import { useCms, useT } from '../../client/context'
import { useText } from '../fieldUtils'
import { ReferencesContext } from '../referencesContext'

export interface EntryTargetType {
  entry?: string
  id?: string
  anchor?: string
}

interface Props {
  value: EntryTargetType
  onChange: (value: EntryTargetType) => void
  // Name of what links there, for the inputs' accessible names.
  label: string
  inputId: string
  invalid?: boolean
}

type DocumentOptionType = { id: string, label: string }

// A page or document of the site, and for pages an optional section to land on.
const EntryPicker = ({ value, onChange, label, inputId, invalid = false }: Props) => {
  const { t } = useT()
  const { config, actions } = useCms()
  const text = useText()
  const references = use(ReferencesContext).relations
  const [found, setFound] = useState<Record<string, string>>({})
  const [suggestions, setSuggestions] = useState<DocumentOptionType[]>([])

  const entries = Object.entries(config.schema)
    .filter(([, entry]) => entry.path)
    .map(([key, entry]) => ({ value: key, label: text(entry.label) }))
  const entry = value.entry && Object.hasOwn(config.schema, value.entry) ? config.schema[value.entry] : undefined
  const anchors = entry?.kind === 'page'
    ? pageSections(entry.fields).flatMap(section => (section.mark?.anchor ? [{ value: section.mark.anchor, label: text(section.label) }] : []))
    : []
  const documentLabel = value.id ? found[value.id] ?? references[value.id]?.label ?? t('relationInput.gone') : null

  const search = async (query: string) => {
    if (!value.entry) return
    const results = await actions.searchRelation(value.entry, query)
    setFound(current => ({ ...current, ...Object.fromEntries(results.map(result => [result.id, result.label])) }))
    setSuggestions(results.map(result => ({ id: result.id, label: result.label })))
  }

  return (
    <div className='LinkInput__Entry'>
      <Dropdown
        inputId={`${inputId}-entry`}
        aria-label={t('fields.link.targetOf', { label })}
        value={value.entry ?? null}
        options={entries}
        optionLabel='label'
        optionValue='value'
        placeholder={t('fields.link.pickEntry')}
        filter={entries.length > 8}
        invalid={invalid && !value.entry}
        className='LinkInput__Href'
        onChange={event => onChange({ entry: event.value })}
      />
      {entry?.kind === 'collection' && (
        <AutoComplete
          inputId={`${inputId}-document`}
          aria-label={t('fields.link.documentOf', { label })}
          dropdown
          forceSelection
          field='label'
          value={value.id ? { id: value.id, label: documentLabel } : null}
          suggestions={suggestions}
          completeMethod={event => void search(event.query)}
          placeholder={t('relationInput.search', { name: text(entry.label).toLocaleLowerCase(config.panelLocale) })}
          invalid={invalid && !value.id}
          className='LinkInput__Href'
          inputClassName='w-full'
          onChange={event => {
            if (typeof event.value === 'string') return
            onChange({ entry: value.entry, id: (event.value as DocumentOptionType | null)?.id })
          }}
        />
      )}
      {anchors.length > 0 && (
        <Dropdown
          inputId={`${inputId}-anchor`}
          aria-label={t('fields.link.sectionOf', { label })}
          value={value.anchor ?? null}
          options={anchors}
          optionLabel='label'
          optionValue='value'
          placeholder={t('fields.link.wholePage')}
          showClear
          className='LinkInput__Href'
          onChange={event => onChange({ entry: value.entry, anchor: event.value ?? undefined })}
        />
      )}
    </div>
  )
}

export default EntryPicker
