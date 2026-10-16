'use client'
import './MediaPicker.sass'
import { Dialog } from 'primereact/dialog'
import MediaLibrary from '../MediaLibrary/MediaLibrary'
import type { MediaItemType } from '../../../core/media'

interface Props {
  header: string
  accept: 'image' | 'document'
  multiple?: boolean
  defaultFolder?: string
  onPick: (items: MediaItemType[]) => void
  onHide: () => void
}

// Mounted only while open: every opening starts on a fresh library query.
const MediaPicker = ({ header, accept, multiple = false, defaultFolder, onPick, onHide }: Props) => (
  <Dialog visible header={header} modal dismissableMask className='MediaPicker' onHide={onHide}>
    <MediaLibrary mode='pick' accept={accept} multiple={multiple} defaultFolder={defaultFolder} onPick={onPick} />
  </Dialog>
)

export default MediaPicker
