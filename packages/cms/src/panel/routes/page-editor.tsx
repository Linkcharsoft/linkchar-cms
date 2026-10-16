import { notFound } from 'next/navigation'
import { textContext } from '../../core/config'
import { withDefaults } from '../../core/defaults'
import { getPage } from '../../core/entries'
import { panelPaths } from '../../core/paths'
import { resolveText } from '../../core/text'
import CmsForm from '../editor/CmsForm/CmsForm'
import BackLink from '../primitives/BackLink/BackLink'
import { navItems } from '../shell/navigation'
import { editingLocale, loadEditorData } from './editorData'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ page: string }>
  searchParams: Promise<{ locale?: string | string[] }>
}

export const pageEditorRoute = (cms: CmsServerType) => {
  const generateMetadata = async ({ params }: Pick<Props, 'params'>): Promise<Metadata> => {
    const entry = getPage(cms.config, (await params).page)
    return { title: entry ? resolveText(entry.label, textContext(cms.config)) : navItems(cms.config).pages.label }
  }

  const Page = async ({ params, searchParams }: Props) => {
    const { page } = await params
    const { profile } = await cms.queries.requireRole()
    const entry = getPage(cms.config, page)
    if (!entry) notFound()

    const document = await cms.queries.getEntryDocument(page)
    const [{ data, references, state }, published, locale] = await Promise.all([
      loadEditorData(cms, entry, document),
      document ? cms.queries.getPublishedData(document.id) : null,
      editingLocale(searchParams)
    ])

    return (
      <main id='main' className='flex-1'>
        <div className='CmsContainer pb-12'>
          <BackLink href={panelPaths(cms.config).pages} label={navItems(cms.config).pages.label} />
          <CmsForm
            entryId={page}
            documentId={document?.id ?? null}
            initialData={data}
            initialRevision={document?.revision ?? null}
            publishedData={published ? withDefaults(cms.config, entry.fields, published) as Record<string, unknown> : null}
            isSuperadmin={profile.role === 'superadmin'}
            title={resolveText(entry.label, textContext(cms.config))}
            status={state?.status}
            references={references}
            initialLocale={locale}
          />
        </div>
      </main>
    )
  }

  return { Page, generateMetadata }
}
