'use client'
import { useTransition } from 'react'
import { useCms, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import { useNotify } from '../../providers/notify'

interface Props {
  entryId: string
  label: string
}

// On success the action redirects to the new document's editor.
const CreateDocumentButton = ({ entryId, label }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const notify = useNotify()
  const [creating, startCreating] = useTransition()

  const create = () => startCreating(async () => {
    const result = await actions.createDocument(entryId)
    if (!result.ok) notify({ severity: 'error', summary: t('collectionList.createFailed'), detail: translate(result.error) })
  })

  return (
    <CustomButton type='button' onClick={create} loading={creating} data-tour='collection-new'>
      <i className='pi pi-plus' aria-hidden='true' />
      {label}
    </CustomButton>
  )
}

export default CreateDocumentButton
