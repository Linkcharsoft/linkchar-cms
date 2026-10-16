import { entryIds, getEntry, withDefaults } from '@linkcharsoft/cms/core'
import Link from 'next/link'
import { cms } from '@/cms/server'
import cmsConfig from '../../../../cms.config'
import DevEditor from './DevEditor'

// Stand-in until the panel arrives in stage 3: edits any entry as JSON and publishes with the mock build.
const DashboardPage = async ({ searchParams }: { searchParams: Promise<{ entry?: string, doc?: string }> }) => {
  const { profile } = await cms.queries.requireRole()
  const { entry: entryId = 'home', doc } = await searchParams
  const entry = getEntry(cmsConfig, entryId)
  if (!entry) return <p>Contenido desconocido.</p>

  const isCollection = entry.kind === 'collection'
  const [row, list, pending, status] = await Promise.all([
    isCollection ? (doc ? cms.queries.getDocument(entryId, doc) : null) : cms.queries.getEntryDocument(entryId),
    isCollection ? cms.queries.listCollection(entryId) : null,
    cms.queries.getPendingChanges(),
    cms.actions.getPublishStatus()
  ])

  return (
    <main style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
        <h1>Panel provisorio</h1>
        <span>{profile.name || profile.id} · {profile.role}</span>
        <a href='/dashboard/auth/signout'>Salir</a>
      </header>
      <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {entryIds(cmsConfig).map(id => <Link key={id} href={{ pathname: '/dashboard', query: { entry: id } }}>{id}</Link>)}
      </nav>
      {list && (
        <ul>
          {list.items.map(item => (
            <li key={item.id}><Link href={{ pathname: '/dashboard', query: { entry: entryId, doc: item.id } }}>{item.title}</Link> · {item.status}</li>
          ))}
        </ul>
      )}
      {(!isCollection || row) && (
        <DevEditor
          key={`${entryId}-${doc ?? ''}`}
          entryId={entryId}
          id={row?.id ?? null}
          data={withDefaults(cmsConfig, entry.fields, row?.data ?? {}) as Record<string, unknown>}
          pending={pending.map(change => ({ id: change.id, title: change.title, action: change.action, revision: change.revision, problems: change.problems }))}
          latest={status.latest}
        />
      )}
    </main>
  )
}

export default DashboardPage
