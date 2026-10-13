import { describe, expect, it } from 'vitest'
import { block, blocks, group, list, relation, relations, tab, text } from '../fields'
import { relationIds } from '../relations'

const fields = {
  main: tab('Main', { category: relation({ label: 'Categoría', to: 'categories' }) }),
  tags: relations({ label: 'Etiquetas', to: 'tags' }),
  meta: group({ label: 'Meta' }, { author: relation({ label: 'Autor', to: 'authors' }) }),
  items: list({ label: 'Ítems' }, { ref: relation({ label: 'Ref', to: 'posts' }), name: text({ label: 'Nombre' }) }),
  content: blocks({ label: 'Bloques' }, { related: block('Relacionado', { post: relation({ label: 'Post', to: 'posts' }) }) })
}

describe('relationIds', () => {
  it('collects ids from every nesting level without duplicates', () => {
    expect(relationIds(fields, {
      category: 'c1',
      tags: ['t1', 't2', 'c1'],
      meta: { author: 'a1' },
      items: [{ ref: 'p1', name: 'x' }, { ref: null }],
      content: [{ _type: 'related', post: 'p2' }, { _type: 'unknown', post: 'p3' }]
    })).toEqual(['c1', 't1', 't2', 'a1', 'p1', 'p2'])
  })

  it('ignores empty or malformed data', () => {
    expect(relationIds(fields, null)).toEqual([])
    expect(relationIds(fields, { category: '', tags: 'nope', items: 'x' })).toEqual([])
  })
})
