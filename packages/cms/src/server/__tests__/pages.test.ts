import cmsConfig from '@playground/cms.config'
import { describe, expect, it } from 'vitest'
import { listPages } from '../pages'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-aaaa-4c1d-9e0f-${String(n).padStart(12, '0')}`

describe('listPages', () => {
  it('lists every page with its status, who edited it and what it shows', async () => {
    const db = createFakeDb({
      documents: [
        { id: ID(1), type: 'home', key: 'home', slug: null, data: {}, revision: 1, sort_order: 0, visible: true, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-02T00:00:00Z', updated_by: ID(90), deleted_at: null },
        { id: ID(2), type: 'projects', key: null, slug: 'a', data: {}, revision: 1, sort_order: 0, visible: true, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', deleted_at: null }
      ]
    })
    signIn(db, { id: ID(90), name: 'Ana' })
    db.rpc.author_names = () => ({ data: [{ id: ID(90), name: 'Ana' }], error: null })

    const pages = await listPages(fakeContext(db, cmsConfig))
    expect(pages.map(page => page.id)).toEqual(['home', 'about', 'notFound'])
    expect(pages[0]).toMatchObject({
      label: 'Inicio', path: '/', href: '/dashboard/paginas/home', status: 'incomplete', updatedBy: 'Ana',
      uses: [{ label: 'Proyectos', href: '/dashboard/colecciones/projects', count: 1 }]
    })
    expect(pages[1]).toMatchObject({ status: null, updatedAt: null })
  })
})
