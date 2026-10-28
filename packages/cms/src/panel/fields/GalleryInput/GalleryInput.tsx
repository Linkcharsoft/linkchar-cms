'use client'
import './GalleryInput.sass'
import { arrayMove } from '@dnd-kit/sortable'
import { useField } from 'formik'
import Image from 'next/image'
import { use, useState } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { useCms, useT } from '../../client/context'
import SortableItem from '../../editor/SortableItem/SortableItem'
import SortableList from '../../editor/SortableList/SortableList'
import MediaPicker from '../../media/MediaPicker/MediaPicker'
import { useMediaText } from '../../media/mediaText'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputError from '../../primitives/InputError/InputError'
import { useNotify } from '../../providers/notify'
import { EntryContext } from '../entryContext'
import { errorId, useFieldError, useFieldLabel, useMediaVariant, useText } from '../fieldUtils'
import { LocaleBadge } from '../LocaleNote/LocaleNote'
import MissingAlt from '../MissingAlt/MissingAlt'
import { useMediaRegistry } from '../referencesContext'
import type { GalleryField } from '../../../core/fields'

interface Props {
  name: string
  field: GalleryField
}

// Other languages show the original gallery until they get their own, which starts as a copy of it.
const GalleryInput = ({ name, field }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const { locale } = use(EntryContext)
  const text = useText()
  const label = useFieldLabel()
  const mediaText = useMediaText()
  const confirm = useConfirm()
  const notify = useNotify()
  const variant = useMediaVariant(name)
  const [{ value }, , { setValue, setTouched }] = useField<string[]>(variant.path)
  const error = useFieldError(variant.path)
  const { media: known, remember } = useMediaRegistry()
  const [isPicking, setIsPicking] = useState(false)
  const ids = Array.isArray(value) ? value : []
  const atMax = field.max !== undefined && ids.length >= field.max
  const inherited = variant.translating && !variant.overridden
  const language = languageName(locale || config.defaultLocale, config.panelLocale)
  const original = languageName(config.defaultLocale, config.panelLocale)

  // An own gallery left empty goes back to the original: a language never shows an empty one by mistake.
  const commit = (next: string[]) => {
    if (variant.overridden && next.length === 0) {
      variant.restore()
      return
    }
    setValue(next, true)
    setTouched(true, false)
  }

  const titleOf = (id: string) => (known[id] && (mediaText(known[id].alt) || known[id].filename)) || t('gallery.removed')

  const askRemove = (id: string) => confirm({
    header: t('gallery.removeHeader'),
    message: t('gallery.removeMessage', { title: titleOf(id) }),
    acceptLabel: t('gallery.remove'),
    tone: 'danger',
    accept: () => commit(ids.filter(entry => entry !== id))
  })

  // What the picker handed over past `max` is left out, and the editor is told.
  const addPicked = (picked: string[]) => {
    const added = picked.filter(id => !ids.includes(id))
    const room = field.max === undefined ? added.length : Math.max(field.max - ids.length, 0)
    if (added.length > room) notify({ severity: 'warn', summary: t('gallery.overMax', { count: room }) })
    return [...ids, ...added.slice(0, room)]
  }
  const thumbnail = (id: string) => (known[id] ? (
    <span className='GalleryInput__Thumb'>
      <Image src={known[id].url} alt='' fill sizes='64px' className='GalleryInput__Image' />
    </span>
  ) : undefined)

  return (
    <fieldset className='GalleryInput'>
      <legend className='GalleryInput__Legend'>
        {label(field)}
        <span className='GalleryInput__Count'>
          {field.max !== undefined ? t('fields.list.count', { count: ids.length, max: field.max }) : ids.length}
        </span>
        {variant.translating && (
          <LocaleBadge own={variant.overridden}>
            {variant.overridden ? t('mediaInput.onlyFor', { language }) : t('mediaInput.sameAs', { language: original })}
          </LocaleBadge>
        )}
      </legend>
      {field.help && <p className='GalleryInput__Help'>{text(field.help)}</p>}

      {inherited ? (
        ids.length > 0 ? (
          <ul className='GalleryInput__Original'>
            {ids.map(id => (
              <li key={id} className='GalleryInput__OriginalItem'>
                {thumbnail(id)}
                <span className='GalleryInput__OriginalTitle'>{titleOf(id)}</span>
              </li>
            ))}
          </ul>
        ) : <p className='GalleryInput__Help'>{t('gallery.noOriginal', { language: original })}</p>
      ) : ids.length > 0 && (
        <SortableList ids={ids} labelOf={titleOf} onMove={(from, to) => commit(arrayMove(ids, from, to))}>
          {ids.map(id => (
            <SortableItem
              key={id}
              id={id}
              title={titleOf(id)}
              thumbnail={thumbnail(id)}
              onRemove={() => askRemove(id)}
            />
          ))}
        </SortableList>
      )}

      {variant.translating && <MissingAlt ids={ids} />}

      <div className='GalleryInput__Actions'>
        {inherited ? (
          <CustomButton type='button' variant='secondary' size='sm' onClick={() => (ids.length > 0 ? variant.override([...ids]) : setIsPicking(true))}>
            <i className='pi pi-images' aria-hidden='true' />
            {t('gallery.override', { language })}
          </CustomButton>
        ) : (
          <CustomButton type='button' variant='secondary' size='sm' disabled={atMax} onClick={() => setIsPicking(true)}>
            <i className='pi pi-images' aria-hidden='true' />
            {t('gallery.add')}
          </CustomButton>
        )}
        {variant.overridden && (
          <CustomButton type='button' variant='ghost' size='sm' onClick={variant.restore}>
            <i className='pi pi-undo' aria-hidden='true' />
            {t('gallery.restore')}
          </CustomButton>
        )}
      </div>
      <InputError id={errorId(name)} message={error} />

      {isPicking && (
        <MediaPicker
          header={t('gallery.add')}
          accept='image'
          multiple
          defaultFolder={field.folder}
          onHide={() => setIsPicking(false)}
          onPick={picked => {
            remember(...picked)
            const next = addPicked(picked.map(item => item.id))
            if (inherited) variant.override(next)
            else commit(next)
            setIsPicking(false)
          }}
        />
      )}
    </fieldset>
  )
}

export default GalleryInput
