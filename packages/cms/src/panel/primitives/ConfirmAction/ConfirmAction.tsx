'use client'
import './ConfirmAction.sass'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { useT } from '../../client/context'
import CustomButton from '../CustomButton/CustomButton'
import DialogFooter from '../DialogFooter/DialogFooter'
import type { ReactNode } from 'react'

export interface ConfirmActionOptionsType {
  header: string
  message: ReactNode
  acceptLabel: string
  tone?: 'primary' | 'danger'
  accept: () => void | Promise<void>
  reject?: () => void
}

// Needs the single <ConfirmAction /> mounted by CmsProviders.
export const useConfirm = () => {
  const { t } = useT()

  return ({ header, message, acceptLabel, tone = 'primary', accept, reject }: ConfirmActionOptionsType) => confirmDialog({
    header,
    message,
    accept,
    reject,
    footer: options => (
      <DialogFooter>
        <CustomButton type='button' variant='secondary' onClick={options.reject}>
          {t('ui.cancel')}
        </CustomButton>
        <CustomButton type='button' variant={tone} onClick={options.accept}>
          {acceptLabel}
        </CustomButton>
      </DialogFooter>
    )
  })
}

const ConfirmAction = () => <ConfirmDialog className='ConfirmAction' draggable={false} />

export default ConfirmAction
