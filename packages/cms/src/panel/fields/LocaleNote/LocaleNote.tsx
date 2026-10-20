'use client'
import './LocaleNote.sass'
import { getIn, useFormikContext } from 'formik'
import { use, useState } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { plainText } from '../../../core/kinds/richText'
import { fieldLocalize } from '../../../core/locales'
import { useCms, useT } from '../../client/context'
import { EntryContext } from '../entryContext'
import { fieldId } from '../fieldUtils'
import type { LeafField } from '../../../core/kinds/registry'
import type { ReactNode } from 'react'

const ORIGINAL_MAX = 280

// Translating: another language than the default one is on screen.
export const useEditingTranslation = () => {
  const { config } = useCms()
  const { locale } = use(EntryContext)
  return config.locales.length > 1 && !!locale && locale !== config.defaultLocale
}

// "Same in every language", for a value every language shares; shown only while translating.
export const SharedBadge = () => {
  const { t } = useT()
  const translating = useEditingTranslation()
  if (!translating) return null
  return (
    <span className='SharedBadge'>
      <i className='pi pi-globe' aria-hidden='true' />
      {t('fields.locale.shared')}
    </span>
  )
}

const OriginalText = ({ id, value }: { id: string, value: unknown }) => {
  const { t } = useT()
  const { config } = useCms()
  const [expanded, setExpanded] = useState(false)
  const language = languageName(config.defaultLocale, config.panelLocale)
  const content = (typeof value === 'string' ? value : plainText(value)).trim()
  const long = content.length > ORIGINAL_MAX

  return (
    <div id={id} className='LocaleOriginal'>
      <span className='LocaleOriginal__Label'>{language}</span>
      {content
        ? <p className='LocaleOriginal__Text'>{long && !expanded ? `${content.slice(0, ORIGINAL_MAX).trimEnd()}…` : content}</p>
        : <p className='LocaleOriginal__Empty'>{t('fields.locale.originalEmpty', { language })}</p>}
      {long && (
        <button type='button' className='LocaleOriginal__Toggle' aria-expanded={expanded} onClick={() => setExpanded(open => !open)}>
          {expanded ? t('fields.locale.showLess') : t('fields.locale.showAll')}
        </button>
      )}
    </div>
  )
}

export interface LocaleNoteType {
  // Next to the label: the shared mark.
  badge: ReactNode
  // Under the label: the default language's text, for a translation.
  note: ReactNode
  // The note's id, for the input's aria-describedby.
  describedBy: string | undefined
}

const NONE: LocaleNoteType = { badge: null, note: null, describedBy: undefined }

// What an input shows about languages while translating; `part` is a localized part (a button's label).
export const useLocaleNote = (name: string, field: LeafField, part?: string): LocaleNoteType => {
  const { config } = useCms()
  const { values } = useFormikContext<Record<string, unknown>>()
  const translating = useEditingTranslation()
  if (!translating) return NONE

  const mode = fieldLocalize(config, field)
  const own = part ? `${name}.${part}` : name
  const translated = part ? typeof mode === 'object' && mode[part] === 'translate' : mode === 'translate'
  if (part ? !translated : mode === false) return { badge: <SharedBadge />, note: null, describedBy: undefined }
  if (!translated) return NONE

  const id = `${fieldId(own)}-original`
  return { badge: null, note: <OriginalText id={id} value={getIn(values, `${own}.${config.defaultLocale}`)} />, describedBy: id }
}
