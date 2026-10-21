import { notFound } from 'next/navigation'
import { textContext } from '../../core/config'
import { getEntry } from '../../core/entries'
import { resolveText } from '../../core/text'
import CmsForm from '../editor/CmsForm/CmsForm'
import { editingLocale, loadEditorData } from './editorData'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ entry: string }>
  searchParams: Promise<{ locale?: string | string[] }>
}

export const singletonEditorRoute = (cms: CmsServerType) => {
  const generateMetadata = async ({ params }: Pick<Props, 'params'>): Promise<Metadata> => {
    const entry = getEntry(cms.config, (await params).entry)
    return entry?.kind === 'singleton' ? { title: resolveText(entry.label, textContext(cms.config)) } : {}
  }

  const Page = async ({ params, searchParams }: Props) => {
    const { entry: entryId } = await params
    const { profile } = await cms.queries.requireRole()
    const entry = getEntry(cms.config, entryId)
    if (entry?.kind !== 'singleton') notFound()

    const document = await cms.queries.getEntryDocument(entryId)
    const [{ data, references, state }, locale] = await Promise.all([loadEditorData(cms, entry, document), editingLocale(searchParams)])

    return (
      <main id='main' className='flex-1'>
        <div className='CmsContainer pb-12'>
          <CmsForm
            entryId={entryId}
            documentId={document?.id ?? null}
            initialData={data}
            initialRevision={document?.revision ?? null}
            isSuperadmin={profile.role === 'superadmin'}
            title={resolveText(entry.label, textContext(cms.config))}
            status={state?.status}
            incomplete={state?.incomplete}
            references={references}
            initialLocale={locale}
          />
        </div>
      </main>
    )
  }

  return { Page, generateMetadata }
}
