'use client'
import { useTransition } from 'react'
import { useCms, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import { useNotify } from '../../providers/notify'

interface Props {
  entryId: string
  label: string
  variant?: 'primary' | 'secondary'
  icon?: string
  className?: string
  tour?: string
}

// On success the action redirects to the new document's editor.
const CreateDocumentButton = ({ entryId, label, variant = 'primary', icon = 'pi-plus', className, tour = 'collection-new' }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const notify = useNotify()
  const [creating, startCreating] = useTransition()

  const create = () => startCreating(async () => {
    const result = await actions.createDocument(entryId)
    if (!result.ok) notify({ severity: 'error', summary: t('collectionList.createFailed'), detail: translate(result.error) })
  })

  return (
    <CustomButton type='button' variant={variant} className={className} onClick={create} loading={creating} data-tour={tour}>
      <i className={`pi ${icon}`} aria-hidden='true' />
      {label}
    </CustomButton>
  )
}

export default CreateDocumentButton
