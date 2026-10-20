'use client'
import './GalleryInput.sass'
import { arrayMove } from '@dnd-kit/sortable'
import { useField } from 'formik'
import Image from 'next/image'
import { useState } from 'react'
import { useT } from '../../client/context'
import SortableItem from '../../editor/SortableItem/SortableItem'
import SortableList from '../../editor/SortableList/SortableList'
import MediaPicker from '../../media/MediaPicker/MediaPicker'
import { useMediaText } from '../../media/mediaText'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputError from '../../primitives/InputError/InputError'
import { useFieldError, useFieldLabel, useText, useValuePath } from '../fieldUtils'
import { useMediaRegistry } from '../referencesContext'
import type { GalleryField } from '../../../core/fields'

interface Props {
  name: string
  field: GalleryField
}

const GalleryInput = ({ name, field }: Props) => {
  const { t } = useT()
  const text = useText()
  const label = useFieldLabel()
  const mediaText = useMediaText()
  const path = useValuePath(name, field)
  const [{ value }, , { setValue, setTouched }] = useField<string[]>(path)
  const error = useFieldError(path)
  const { media: known, remember } = useMediaRegistry()
  const [isPicking, setIsPicking] = useState(false)
  const ids = Array.isArray(value) ? value : []
  const atMax = field.max !== undefined && ids.length >= field.max

  const commit = (next: string[]) => {
    setValue(next)
    setTouched(true, false)
  }

  const titleOf = (id: string) => (known[id] && (mediaText(known[id].alt) || known[id].filename)) || t('gallery.removed')

  return (
    <fieldset className='GalleryInput'>
      <legend className='GalleryInput__Legend'>
        {label(field)}
        <span className='GalleryInput__Count'>
          {field.max !== undefined ? t('fields.list.count', { count: ids.length, max: field.max }) : ids.length}
        </span>
      </legend>
      {field.help && <p className='GalleryInput__Help'>{text(field.help)}</p>}

      {ids.length > 0 && (
        <SortableList ids={ids} labelOf={titleOf} onMove={(from, to) => commit(arrayMove(ids, from, to))}>
          {ids.map(id => (
            <SortableItem
              key={id}
              id={id}
              title={titleOf(id)}
              thumbnail={known[id] ? (
                <span className='GalleryInput__Thumb'>
                  <Image src={known[id].url} alt='' fill sizes='64px' className='GalleryInput__Image' />
                </span>
              ) : undefined}
              onRemove={() => commit(ids.filter(entry => entry !== id))}
            />
          ))}
        </SortableList>
      )}

      <div>
        <CustomButton type='button' variant='secondary' size='sm' disabled={atMax} onClick={() => setIsPicking(true)}>
          <i className='pi pi-images' aria-hidden='true' />
          {t('gallery.add')}
        </CustomButton>
      </div>
      <InputError message={error} />

      {isPicking && (
        <MediaPicker
          header={t('gallery.add')}
          accept='image'
          multiple
          defaultFolder={field.folder}
          onHide={() => setIsPicking(false)}
          onPick={picked => {
            remember(...picked)
            const added = picked.map(item => item.id).filter(id => !ids.includes(id))
            commit([...ids, ...added].slice(0, field.max ?? Infinity))
            setIsPicking(false)
          }}
        />
      )}
    </fieldset>
  )
}

export default GalleryInput
