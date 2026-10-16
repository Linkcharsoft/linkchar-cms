'use client'
import './UrlDialog.sass'
import { Dialog } from 'primereact/dialog'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import { useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DialogFooter from '../../primitives/DialogFooter/DialogFooter'
import InputContainer from '../../primitives/InputContainer/InputContainer'

export interface UrlDialogValueType {
  url: string
  newTab: boolean
}

interface Props {
  header: string
  label: string
  placeholder: string
  initialValue?: UrlDialogValueType
  withNewTab?: boolean
  validate: (url: string) => string | null
  onSubmit: (value: UrlDialogValueType) => void
  onRemove?: () => void
  onHide: () => void
}

// Mounted only while open, so every opening starts from initialValue.
const UrlDialog = ({ header, label, placeholder, initialValue, withNewTab = false, validate, onSubmit, onRemove, onHide }: Props) => {
  const { t } = useT()
  const [url, setUrl] = useState(initialValue?.url ?? '')
  const [newTab, setNewTab] = useState(initialValue?.newTab ?? false)
  const [error, setError] = useState<string>()

  const submit = () => {
    const message = validate(url.trim())
    if (message) {
      setError(message)
      return
    }
    onSubmit({ url: url.trim(), newTab })
  }

  return (
    <Dialog
      visible
      header={header}
      modal
      dismissableMask
      className='UrlDialog'
      onHide={onHide}
      footer={(
        <DialogFooter start={onRemove && <CustomButton type='button' variant='danger-ghost' onClick={onRemove}>{t('urlDialog.remove')}</CustomButton>}>
          <CustomButton type='button' variant='secondary' onClick={onHide}>{t('ui.cancel')}</CustomButton>
          <CustomButton type='button' onClick={submit}>{t('urlDialog.apply')}</CustomButton>
        </DialogFooter>
      )}
    >
      <form className='UrlDialog__Form' noValidate onSubmit={event => { event.preventDefault(); submit() }}>
        <InputContainer label={label} htmlFor='url-dialog-input' error={error}>
          <InputText
            id='url-dialog-input'
            value={url}
            placeholder={placeholder}
            autoComplete='off'
            invalid={!!error}
            onChange={event => setUrl(event.target.value)}
          />
        </InputContainer>
        {withNewTab && (
          <div className='flex items-center gap-3'>
            <InputSwitch inputId='url-dialog-newtab' checked={newTab} onChange={event => setNewTab(!!event.value)} />
            <label htmlFor='url-dialog-newtab' className='UrlDialog__NewTab'>{t('fields.link.newTab')}</label>
          </div>
        )}
      </form>
    </Dialog>
  )
}

export default UrlDialog
