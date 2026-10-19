'use client'
import './SeoPreview.sass'
import { getIn, useFormikContext } from 'formik'
import { classNames } from 'primereact/utils'
import { use, useEffect, useState } from 'react'
import { getEntry } from '../../../core/entries'
import { entryPath, slugsOf } from '../../../core/urls'
import { useCms, useT } from '../../client/context'
import { EntryContext } from '../../fields/entryContext'
import { useStoredText } from '../../fields/fieldUtils'
import type { SeoMarkType } from '../../../core/fields'

interface Props {
  name: string
  mark: SeoMarkType
}

// Google cuts by pixel width; these lengths approximate it.
const TITLE_CUT = 60
const DESCRIPTION_CUT = 155

const cut = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value)

const SeoPreview = ({ name, mark }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const stored = useStoredText()
  const { values } = useFormikContext<Record<string, unknown>>()
  const { entryId, locale } = use(EntryContext)
  const entry = entryId ? getEntry(config, entryId) : null
  const text = (path: string) => stored(getIn(values, path)).trim()

  const ownTitle = text(`${name}.title`)
  const ownDescription = text(`${name}.description`)
  const fallbackTitle = mark.titleFrom ? text(mark.titleFrom) : ''
  const fallbackDescription = mark.descriptionFrom ? text(mark.descriptionFrom) : ''

  const path = (entry?.path ? entryPath(config, entry, { locale, slug: slugsOf(config, entry, values)[locale] }) : mark.path) ?? '/'
  const [host, setHost] = useState(config.site.url ? new URL(config.site.url).host : '')
  // Without site.url the panel's own host stands in; read after hydration so server and client agree.
  useEffect(() => {
    if (!config.site.url) setHost(window.location.host)
  }, [config.site.url])

  const crumbs = [host, ...path.split('/').filter(Boolean)].join(' › ')

  const title = ownTitle || fallbackTitle
  const description = ownDescription || fallbackDescription

  return (
    <div className='SeoPreview' role='group' aria-label={t('editor.seoPreview.group')}>
      <p className='SeoPreview__Label'>{t('editor.seoPreview.label')}</p>
      <div className='SeoPreview__Card'>
        <p className='SeoPreview__Url'>{crumbs}</p>
        <p className={classNames('SeoPreview__Title', { 'SeoPreview__Title--Empty': !title })}>
          {title ? cut(config.site.titleTemplate.replace('%s', title), TITLE_CUT) : t('editor.seoPreview.titleMissing')}
        </p>
        <p className={classNames('SeoPreview__Description', { 'SeoPreview__Description--Empty': !description })}>
          {description ? cut(description, DESCRIPTION_CUT) : t('editor.seoPreview.descriptionMissing')}
        </p>
      </div>
      {(!ownTitle && fallbackTitle) || (!ownDescription && fallbackDescription) ? (
        <p className='SeoPreview__Note'>
          <i className='pi pi-info-circle' aria-hidden='true' />
          {t('editor.seoPreview.fallback')}
        </p>
      ) : null}
    </div>
  )
}

export default SeoPreview
