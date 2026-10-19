'use client'
import { useField } from 'formik'
import { AutoComplete } from 'primereact/autocomplete'
import { Dropdown } from 'primereact/dropdown'
import { use, useState } from 'react'
import { pageSections } from '../../../core/pages'
import { useCms, useT } from '../../client/context'
import { fieldId, useText } from '../fieldUtils'
import { ReferencesContext } from '../referencesContext'
import type { RelationOptionType } from '../../../server/documents'

interface Props {
  // Path of the link value: the picker fills its entry, id and anchor.
  name: string
  label: string
}

type DocumentOptionType = { id: string, label: string }

// A page or document of the site, and for pages an optional section to land on.
const EntryPicker = ({ name, label }: Props) => {
  const { t } = useT()
  const { config, actions } = useCms()
  const text = useText()
  const references = use(ReferencesContext).relations
  const [{ value: entryId }, , entryHelpers] = useField<string | undefined>(`${name}.entry`)
  const [{ value: documentId }, , idHelpers] = useField<string | undefined>(`${name}.id`)
  const [{ value: anchor }, , anchorHelpers] = useField<string | undefined>(`${name}.anchor`)
  const [found, setFound] = useState<Record<string, string>>({})
  const [suggestions, setSuggestions] = useState<DocumentOptionType[]>([])
  const id = fieldId(name)

  const entries = Object.entries(config.schema)
    .filter(([, entry]) => entry.path)
    .map(([value, entry]) => ({ value, label: text(entry.label) }))
  const entry = entryId && Object.hasOwn(config.schema, entryId) ? config.schema[entryId] : undefined
  const anchors = entry?.kind === 'page'
    ? pageSections(entry.fields).flatMap(section => (section.mark?.anchor ? [{ value: section.mark.anchor, label: text(section.label) }] : []))
    : []
  const documentLabel = documentId ? found[documentId] ?? references[documentId]?.label ?? t('relationInput.gone') : null

  const search = async (query: string) => {
    if (!entryId) return
    const results: RelationOptionType[] = await actions.searchRelation(entryId, query)
    setFound(current => ({ ...current, ...Object.fromEntries(results.map(result => [result.id, result.label])) }))
    setSuggestions(results.map(result => ({ id: result.id, label: result.label })))
  }

  const pickEntry = (next: string) => {
    entryHelpers.setValue(next)
    idHelpers.setValue(undefined)
    anchorHelpers.setValue(undefined)
  }

  return (
    <div className='LinkInput__Entry'>
      <Dropdown
        inputId={`${id}-entry`}
        aria-label={t('fields.link.targetOf', { label })}
        value={entryId ?? null}
        options={entries}
        optionLabel='label'
        optionValue='value'
        placeholder={t('fields.link.pickEntry')}
        filter={entries.length > 8}
        className='LinkInput__Href'
        onChange={event => pickEntry(event.value)}
      />
      {entry?.kind === 'collection' && (
        <AutoComplete
          inputId={`${id}-document`}
          aria-label={t('fields.link.documentOf', { label })}
          dropdown
          forceSelection
          field='label'
          value={documentId ? { id: documentId, label: documentLabel } : null}
          suggestions={suggestions}
          completeMethod={event => void search(event.query)}
          placeholder={t('relationInput.search', { name: text(entry.label).toLocaleLowerCase(config.panelLocale) })}
          className='LinkInput__Href'
          inputClassName='w-full'
          onChange={event => {
            if (typeof event.value === 'string') return
            idHelpers.setValue((event.value as DocumentOptionType | null)?.id)
          }}
        />
      )}
      {anchors.length > 0 && (
        <Dropdown
          inputId={`${id}-anchor`}
          aria-label={t('fields.link.sectionOf', { label })}
          value={anchor ?? null}
          options={anchors}
          optionLabel='label'
          optionValue='value'
          placeholder={t('fields.link.wholePage')}
          showClear
          className='LinkInput__Href'
          onChange={event => anchorHelpers.setValue(event.value ?? undefined)}
        />
      )}
    </div>
  )
}

export default EntryPicker
