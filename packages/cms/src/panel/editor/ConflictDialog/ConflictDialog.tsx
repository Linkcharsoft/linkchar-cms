'use client'
import './ConflictDialog.sass'
import { Dialog } from 'primereact/dialog'
import { useFormatDate, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'

interface Props {
  visible: boolean
  updatedAt: string | null
  // Labels of the sections (or fields) both people changed.
  parts: string[]
  onLoadCurrent: () => void
}

// Nothing is overwritten: the editor's attempt was already stored as a 'conflict' version on the server.
const ConflictDialog = ({ visible, updatedAt, parts, onLoadCurrent }: Props) => {
  const { t } = useT()
  const formatDate = useFormatDate()

  return (
    <Dialog
      visible={visible}
      header={t('editor.conflict.header')}
      closable={false}
      modal
      className='ConflictDialog'
      onHide={onLoadCurrent}
      footer={<CustomButton type='button' onClick={onLoadCurrent}>{t('editor.conflict.loadCurrent')}</CustomButton>}
    >
      <p className='ConflictDialog__Text'>
        {t('editor.conflict.text', {
          parts: parts.length > 0 ? t('editor.conflict.parts', { parts: parts.join(', ') }) : '',
          time: updatedAt ? t('editor.conflict.time', { time: formatDate(updatedAt, 'shortDateTime') }) : ''
        })}
      </p>
      <p className='ConflictDialog__Text'>{t('editor.conflict.kept')}</p>
    </Dialog>
  )
}

export default ConflictDialog
