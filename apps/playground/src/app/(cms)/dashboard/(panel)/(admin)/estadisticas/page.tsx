import { resolveText, textContext } from '@linkcharsoft/cms/core'
import { PanelScreen } from '@linkcharsoft/cms/panel'
import { cms } from '@/cms/server'
import type { Metadata } from 'next'

// A project screen (extension "stats" in cms.config.ts): the panel layout and its primitives, the project's own data.
const TEXTS = {
  title: { es: 'Estadísticas', en: 'Statistics' },
  subtitle: { es: 'Cuántos contenidos tiene cada colección, publicados o no.', en: 'How many items each collection has, published or not.' }
}

const text = (value: { es: string, en: string }) => resolveText(value, textContext(cms.config))

export const metadata: Metadata = { title: text(TEXTS.title) }

const StatsPage = async () => {
  await cms.queries.requireRole('admin')
  const collections = Object.entries(cms.config.schema).filter(([, entry]) => entry.kind === 'collection')
  const counts = await Promise.all(collections.map(async ([id, entry]) => ({
    id,
    label: resolveText(entry.label, textContext(cms.config)),
    total: (await cms.queries.listCollection(id)).total
  })))

  return (
    <PanelScreen title={text(TEXTS.title)} subtitle={text(TEXTS.subtitle)}>
      <ul className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3' data-testid='stats'>
        {counts.map(({ id, label, total }) => (
          <li key={id} className='rounded-2xl border border-cms-border bg-cms-surface p-5'>
            <p className='cms-text-semibold-14 text-cms-ink-600'>{label}</p>
            <p className='font-cms-display cms-text-bold-32 text-cms-primary'>{total}</p>
          </li>
        ))}
      </ul>
    </PanelScreen>
  )
}

export default StatsPage
