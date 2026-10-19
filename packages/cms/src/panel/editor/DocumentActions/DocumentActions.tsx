'use client'
import './DocumentActions.sass'
import { useRouter } from 'next/navigation'
import { InputSwitch } from 'primereact/inputswitch'
import { useState } from 'react'
import { useCms, usePaths, useT } from '../../client/context'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import { useNotify } from '../../providers/notify'
import type { Route } from 'next'

interface Props {
  entryId: string
  documentId: string
  title?: string
  visible?: boolean
  // Reference-only collections (authors, categories) are always shown.
  canHide?: boolean
  // Icon-only, for table rows.
  compact?: boolean
}

const DocumentActions = ({ entryId, documentId, title, visible = true, canHide = true, compact = false }: Props) => {
  const { t } = useT()
  const { actions } = useCms()
  const paths = usePaths()
  const router = useRouter()
  const notify = useNotify()
  const confirm = useConfirm()
  const name = title ? `"${title}"` : t('editor.document.thisContent')
  const [shown, setShown] = useState(visible)
  const [lastVisible, setLastVisible] = useState(visible)

  if (visible !== lastVisible) {
    setLastVisible(visible)
    setShown(visible)
  }

  const toggleVisibility = async (next: boolean) => {
    setShown(next)
    const result = await actions.setDocumentVisibility(entryId, documentId, next)
    if (!result.ok) {
      setShown(!next)
      notify({ severity: 'error', summary: t('editor.document.visibilityFailed') })
      return
    }
    notify({
      severity: 'info',
      summary: next ? t('editor.document.willShow') : t('editor.document.willHide'),
      detail: t('editor.document.nextPublish')
    })
    router.refresh()
  }

  const askTrash = async () => {
    // Without the usage list the trash still works: the publish screen repeats the warning.
    const usage = (await actions.getDocumentUsage(documentId).catch(() => [])).filter(place => !place.trashed)
    confirm({
      header: t('editor.document.trashHeader'),
      message: (
        <div className='DocumentActions__Confirm'>
          <p>{t('editor.document.trashMessage', { name })}</p>
          {usage.length > 0 && (
            <>
              <p>{t('editor.document.usedBy')}</p>
              <ul className='DocumentActions__Usage'>
                {usage.map(place => <li key={place.documentId}>{place.label}</li>)}
              </ul>
            </>
          )}
        </div>
      ),
      acceptLabel: t('editor.document.trashHeader'),
      tone: 'danger',
      accept: async () => {
        const result = await actions.trashDocument(entryId, documentId)
        if (!result.ok) {
          notify({ severity: 'error', summary: t('editor.document.trashFailed') })
          return
        }
        notify({ severity: 'success', summary: t('editor.document.trashed') })
        if (compact) router.refresh()
        else router.push(paths.collection(entryId) as Route)
      }
    })
  }

  if (compact) {
    return (
      <div className='DocumentActions DocumentActions--Compact'>
        <CustomButton
          type='button'
          variant='ghost'
          size='md'
          iconOnly
          icon='pi pi-copy'
          aria-label={title ? t('editor.document.duplicateNamed', { name: title }) : t('editor.document.duplicate')}
          onClick={() => actions.duplicateDocument(entryId, documentId)}
        />
        <CustomButton
          type='button'
          variant='danger-ghost'
          size='md'
          iconOnly
          icon='pi pi-trash'
          aria-label={t('editor.document.trashNamed', { name: title ?? t('editor.document.thisContent') })}
          onClick={askTrash}
        />
      </div>
    )
  }

  return (
    <div className='DocumentActions'>
      {canHide && (
        <div className='DocumentActions__Visibility' data-tour='visibility'>
          <InputSwitch inputId={`${documentId}-visible`} checked={shown} onChange={event => toggleVisibility(!!event.value)} />
          <label htmlFor={`${documentId}-visible`} className='DocumentActions__Label'>{t('editor.document.showOnSite')}</label>
        </div>
      )}
      <CustomButton type='button' variant='secondary' size='sm' onClick={() => actions.duplicateDocument(entryId, documentId)}>
        <i className='pi pi-copy' aria-hidden='true' />
        {t('editor.document.duplicate')}
      </CustomButton>
      <CustomButton type='button' variant='danger-ghost' size='sm' onClick={askTrash}>
        <i className='pi pi-trash' aria-hidden='true' />
        {t('editor.document.trash')}
      </CustomButton>
    </div>
  )
}

export default DocumentActions
