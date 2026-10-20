'use client'
import './LocaleCounts.sass'
import { classNames } from 'primereact/utils'
import { use } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { useCms, useT } from '../../client/context'
import { EntryContext } from '../../fields/entryContext'

interface Props {
  // Missing items per locale.
  counts: Record<string, number>
}

export const totalMissing = (counts: Record<string, number>) => Object.values(counts).reduce((sum, count) => sum + count, 0)

// "ES 1 · EN 3": what is missing in each language, the one being edited highlighted.
const LocaleCounts = ({ counts }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const { locale } = use(EntryContext)
  const shown = config.locales.filter(code => (counts[code] ?? 0) > 0)
  if (shown.length === 0) return null

  return (
    <span className='LocaleCounts'>
      {shown.map(code => (
        <span key={code} aria-hidden='true' className={classNames('LocaleCounts__Item', { 'LocaleCounts__Item--Current': code === locale })}>
          {`${code.toUpperCase()} ${counts[code]}`}
        </span>
      ))}
      <span className='sr-only'>
        {shown.map(code => t('editor.page.missingIn', { count: counts[code], language: languageName(code, config.panelLocale) })).join(', ')}
      </span>
    </span>
  )
}

export default LocaleCounts
