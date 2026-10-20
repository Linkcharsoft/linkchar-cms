'use client'
import './MissingAlt.sass'
import { Fragment, use, useState } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { missingAltLocales } from '../../../core/media'
import { useCms, useT } from '../../client/context'
import MediaDetails from '../../media/MediaDetails/MediaDetails'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import Notice from '../../primitives/Notice/Notice'
import { EntryContext } from '../entryContext'
import { useMediaRegistry } from '../referencesContext'
import type { MediaItemType } from '../../../core/media'

interface Props {
  // The files a field uses; only the ones without alt text in the language on screen are listed.
  ids: string[]
}

// The alt texts publishing still asks for in this language, each one a click away from its form.
const MissingAlt = ({ ids }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const { locale } = use(EntryContext)
  const { media, remember } = useMediaRegistry()
  const [editing, setEditing] = useState<MediaItemType | null>(null)
  const lacking = [...new Set(ids)]
    .map(id => media[id])
    .filter((item): item is MediaItemType => !!item && missingAltLocales(config, item.alt).includes(locale))
  const language = languageName(locale || config.defaultLocale, config.panelLocale)

  const details = editing && (
    <MediaDetails
      item={editing}
      canPurge={false}
      focusLocale={locale}
      onChanged={remember}
      onRemoved={() => remember({ ...editing, deletedAt: new Date().toISOString() })}
      onHide={() => setEditing(null)}
    />
  )

  if (lacking.length === 0) return details || null

  return (
    <>
      {ids.length === 1 ? (
        <Notice
          tone='warning'
          action={(
            <CustomButton type='button' variant='secondary' size='xs' aria-label={t('mediaInput.completeAltOf', { language })} onClick={() => setEditing(lacking[0])}>
              {t('mediaInput.completeAlt')}
            </CustomButton>
          )}
        >
          {t('mediaInput.altMissing', { language })}
        </Notice>
      ) : (
        <Notice tone='warning'>
          {t('mediaInput.altsMissing', { language })}{' '}
          {lacking.map((item, index) => (
            <Fragment key={item.id}>
              {index > 0 && ', '}
              <button type='button' className='MissingAlt__Link' onClick={() => setEditing(item)}>{item.filename}</button>
            </Fragment>
          ))}
          .
        </Notice>
      )}
      {details}
    </>
  )
}

export default MissingAlt
