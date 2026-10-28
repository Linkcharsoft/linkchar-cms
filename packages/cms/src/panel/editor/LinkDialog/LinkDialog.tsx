'use client'
import './LinkDialog.sass'
import { Dialog } from 'primereact/dialog'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import { SelectButton } from 'primereact/selectbutton'
import { useState } from 'react'
import { sanitizeHref } from '../../../core/richText/nodes'
import { useCms, useT } from '../../client/context'
import EntryPicker from '../../fields/LinkInput/EntryPicker'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DialogFooter from '../../primitives/DialogFooter/DialogFooter'
import { focusField } from '../../primitives/DialogFooter/focusField'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import InputError from '../../primitives/InputError/InputError'
import type { EntryTargetType } from '../../fields/LinkInput/EntryPicker'

export interface LinkDialogValueType {
  url: string
  newTab: boolean
  // A page or document of the site; null for an address typed by hand.
  target: EntryTargetType | null
}

interface Props {
  initialValue: LinkDialogValueType
  onSubmit: (value: LinkDialogValueType) => void
  onRemove?: () => void
  onHide: () => void
}

type ModeType = 'entry' | 'url'

// The rich text link: a page or document of the site, or another address. Mounted only while open.
const LinkDialog = ({ initialValue, onSubmit, onRemove, onHide }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const [mode, setMode] = useState<ModeType>(initialValue.target || !initialValue.url ? 'entry' : 'url')
  const [target, setTarget] = useState<EntryTargetType>(initialValue.target ?? {})
  const [url, setUrl] = useState(initialValue.url)
  const [newTab, setNewTab] = useState(initialValue.newTab)
  const [error, setError] = useState<string>()

  const submit = () => {
    if (mode === 'entry') {
      const entry = target.entry ? config.schema[target.entry] : undefined
      if (!entry || (entry.kind === 'collection' && !target.id)) {
        setError(t('validation.linkEntry'))
        return
      }
      onSubmit({ url: '', newTab, target })
      return
    }
    const href = url.trim()
    if (!href || !sanitizeHref(href)) {
      setError(href ? t('richTextEditor.linkInvalid') : t('richTextEditor.linkRequired'))
      return
    }
    onSubmit({ url: href, newTab, target: null })
  }

  const modes = [
    { value: 'entry', label: t('fields.link.kinds.entry') },
    { value: 'url', label: t('fields.link.kinds.internal') }
  ]

  return (
    <Dialog
      visible
      header={t('richTextEditor.link')}
      modal
      dismissableMask
      className='LinkDialog'
      focusOnShow={false}
      onShow={() => focusField(mode === 'entry' ? 'link-dialog-entry' : 'link-dialog-url')}
      onHide={onHide}
      footer={(
        <DialogFooter start={onRemove && <CustomButton type='button' variant='danger-ghost' onClick={onRemove}>{t('urlDialog.remove')}</CustomButton>}>
          <CustomButton type='button' variant='secondary' onClick={onHide}>{t('ui.cancel')}</CustomButton>
          <CustomButton type='button' onClick={submit}>{t('urlDialog.apply')}</CustomButton>
        </DialogFooter>
      )}
    >
      <form className='LinkDialog__Form' noValidate onSubmit={event => { event.preventDefault(); submit() }}>
        <SelectButton
          value={mode}
          options={modes}
          optionLabel='label'
          optionValue='value'
          allowEmpty={false}
          aria-label={t('fields.link.typeOf', { label: t('richTextEditor.link') })}
          onChange={event => {
            setMode(event.value)
            setError(undefined)
          }}
        />
        {mode === 'entry'
          ? (
            <div className='LinkDialog__Entry'>
              <EntryPicker value={target} label={t('richTextEditor.link')} inputId='link-dialog' invalid={!!error} onChange={next => { setTarget(next); setError(undefined) }} />
              <InputError message={error} />
            </div>
          )
          : (
            <InputContainer label={t('richTextEditor.linkLabel')} htmlFor='link-dialog-url' error={error}>
              <InputText
                id='link-dialog-url'
                value={url}
                placeholder={t('richTextEditor.linkPlaceholder')}
                autoComplete='off'
                invalid={!!error}
                onChange={event => setUrl(event.target.value)}
              />
            </InputContainer>
          )}
        <div className='flex items-center gap-3'>
          <InputSwitch inputId='link-dialog-newtab' checked={newTab} onChange={event => setNewTab(!!event.value)} />
          <label htmlFor='link-dialog-newtab' className='LinkDialog__NewTab'>{t('fields.link.newTab')}</label>
        </div>
      </form>
    </Dialog>
  )
}

export default LinkDialog
