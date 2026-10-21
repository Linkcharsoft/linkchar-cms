import { notFound } from 'next/navigation'
import { textContext } from '../../core/config'
import { documentTitle, getCollection } from '../../core/entries'
import { panelPaths } from '../../core/paths'
import { resolveText } from '../../core/text'
import CmsForm from '../editor/CmsForm/CmsForm'
import DocumentActions from '../editor/DocumentActions/DocumentActions'
import BackLink from '../primitives/BackLink/BackLink'
import { editingLocale, loadEditorData } from './editorData'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ entry: string, id: string }>
  searchParams: Promise<{ locale?: string | string[] }>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const documentEditorRoute = (cms: CmsServerType) => {
  const generateMetadata = async ({ params }: Pick<Props, 'params'>): Promise<Metadata> => {
    const { entry: entryId, id } = await params
    const entry = getCollection(cms.config, entryId)
    if (!entry || !UUID.test(id)) return {}
    const document = await cms.queries.getDocument(entryId, id)
    return { title: documentTitle(entry, document?.data, textContext(cms.config)) }
  }

  const Page = async ({ params, searchParams }: Props) => {
    const { entry: entryId, id } = await params
    const { profile } = await cms.queries.requireRole()
    const entry = getCollection(cms.config, entryId)
    if (!entry || !UUID.test(id)) notFound()

    const document = await cms.queries.getDocument(entryId, id)
    if (!document) notFound()

    const [{ data, references, state }, locale] = await Promise.all([loadEditorData(cms, entry, document), editingLocale(searchParams)])
    const ctx = textContext(cms.config)

    return (
      <main id='main' className='flex-1'>
        <div className='CmsContainer pb-12'>
          <BackLink href={panelPaths(cms.config).collection(entryId)} label={resolveText(entry.label, ctx)} />
          <CmsForm
            entryId={entryId}
            documentId={document.id}
            initialData={data}
            initialRevision={document.revision}
            isSuperadmin={profile.role === 'superadmin'}
            title={documentTitle(entry, data, ctx)}
            status={state?.status}
            incomplete={state?.incomplete}
            references={references}
            initialLocale={locale}
            toolbar={<DocumentActions key='actions' entryId={entryId} documentId={document.id} visible={state?.visible} canHide={!entry.referenceOnly} />}
          />
        </div>
      </main>
    )
  }

  return { Page, generateMetadata }
}
