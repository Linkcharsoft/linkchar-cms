'use client'
import './CreateRelatedDialog.sass'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import { collectionNewLabel, getCollection } from '../../../core/entries'
import { dataFields } from '../../../core/walk'
import { useCms, useT, useTextContext } from '../../client/context'
import { useText } from '../../fields/fieldUtils'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DialogFooter from '../../primitives/DialogFooter/DialogFooter'
import { focusField } from '../../primitives/DialogFooter/focusField'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { entryNavLabel } from '../../shell/navigation'
import type { RelationOptionType } from '../../../server/documents'

interface Props {
  entryId: string
  // The search typed in the picker, so it doesn't have to be written twice.
  initialTitle?: string
  onCreated: (option: RelationOptionType) => void
  onHide: () => void
}

// Mounted only while open, so every opening starts from initialTitle.
const CreateRelatedDialog = ({ entryId, initialTitle = '', onCreated, onHide }: Props) => {
  const { t, locale } = useT()
  const { config, actions } = useCms()
  const textCtx = useTextContext()
  const text = useText()
  const entry = getCollection(config, entryId)
  const titleField = entry ? dataFields(entry.fields).find(([key]) => key === entry.titleField)?.[1] : undefined
  const maxLength = titleField && 'maxLength' in titleField ? titleField.maxLength : undefined
  const [title, setTitle] = useState(initialTitle.slice(0, maxLength))
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const label = titleField ? text(titleField.label) : t('createRelated.titleLabel')

  const submit = async () => {
    if (!title.trim()) {
      setError(t('createRelated.required', { label: label.toLocaleLowerCase(locale) }))
      return
    }
    setSaving(true)
    try {
      const created = await actions.createRelated(entryId, title).catch(() => null)
      if (!created) {
        setError(t('createRelated.failed'))
        return
      }
      onCreated(created)
    } finally {
      setSaving(false)
    }
  }

  if (!entry) return null

  return (
    <Dialog
      visible
      header={collectionNewLabel(entry, textCtx)}
      modal
      dismissableMask
      className='CreateRelatedDialog'
      focusOnShow={false}
      onShow={() => focusField('create-related-title')}
      onHide={onHide}
      footer={(
        <DialogFooter>
          <CustomButton type='button' variant='secondary' onClick={onHide}>{t('ui.cancel')}</CustomButton>
          <CustomButton type='button' loading={saving} onClick={submit}>{t('createRelated.create')}</CustomButton>
        </DialogFooter>
      )}
    >
      <form className='CreateRelatedDialog__Form' noValidate onSubmit={event => { event.preventDefault(); void submit() }}>
        <InputContainer label={label} htmlFor='create-related-title' error={error}>
          <InputText
            id='create-related-title'
            value={title}
            maxLength={maxLength}
            autoComplete='off'
            invalid={!!error}
            onChange={event => setTitle(event.target.value)}
          />
        </InputContainer>
        <p className='CreateRelatedDialog__Help'>{t('createRelated.help', { place: entryNavLabel(config, entryId) })}</p>
      </form>
    </Dialog>
  )
}

export default CreateRelatedDialog
