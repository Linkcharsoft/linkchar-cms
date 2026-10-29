'use client'
import './MediaPicker.sass'
import { Dialog } from 'primereact/dialog'
import { useState } from 'react'
import { useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DialogFooter from '../../primitives/DialogFooter/DialogFooter'
import MediaLibrary from '../MediaLibrary/MediaLibrary'
import type { MediaItemType, MediaTypeType } from '../../../core/media'

interface Props {
  header: string
  accept: MediaTypeType
  multiple?: boolean
  defaultFolder?: string
  onPick: (items: MediaItemType[]) => void
  onHide: () => void
}

// Mounted only while open: every opening starts on a fresh library query.
const MediaPicker = ({ header, accept, multiple = false, defaultFolder, onPick, onHide }: Props) => {
  const { t } = useT()
  const [selected, setSelected] = useState<MediaItemType[]>([])

  return (
    <Dialog
      visible
      header={header}
      modal
      dismissableMask
      className='MediaPicker'
      pt={{ footer: { className: 'border-t border-cms-border' } }}
      onHide={onHide}
      footer={(
        <DialogFooter start={<span className='MediaPicker__Count'>{selected.length ? t('media.library.selected', { count: selected.length }) : t('media.library.pickOne')}</span>}>
          <CustomButton type='button' disabled={!selected.length} onClick={() => onPick(selected)}>
            {multiple ? t('media.library.useSelection') : t('media.library.useFile')}
          </CustomButton>
        </DialogFooter>
      )}
    >
      <MediaLibrary mode='pick' accept={accept} multiple={multiple} defaultFolder={defaultFolder} selected={selected} onSelect={setSelected} />
    </Dialog>
  )
}

export default MediaPicker
