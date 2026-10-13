import { describe, expect, it } from 'vitest'
import { block, blocks, file, gallery, group, image, list, relation, relations, tab, text } from '../fields'
import { documentReferences } from '../references'

const fields = {
  main: tab('Main', { category: relation({ label: 'Categoría', to: 'categories' }), cover: image({ label: 'Portada' }) }),
  tags: relations({ label: 'Etiquetas', to: 'tags' }),
  meta: group({ label: 'Meta' }, { author: relation({ label: 'Autor', to: 'authors' }), logo: image({ label: 'Logo' }) }),
  items: list({ label: 'Ítems' }, { ref: relation({ label: 'Ref', to: 'posts' }), name: text({ label: 'Nombre' }) }),
  content: blocks({ label: 'Bloques' }, {
    related: block('Relacionado', { post: relation({ label: 'Post', to: 'posts' }) }),
    galeria: block('Galería', { images: gallery({ label: 'Imágenes' }) }),
    descarga: block('Descarga', { pdf: file({ label: 'PDF' }) })
  })
}

describe('documentReferences', () => {
  it('collects relations and media from every nesting level without duplicates', () => {
    expect(documentReferences(fields, {
      category: 'c1',
      cover: 'm1',
      tags: ['t1', 't2', 'c1'],
      meta: { author: 'a1', logo: 'm2' },
      items: [{ ref: 'p1', name: 'x' }, { ref: null }],
      content: [
        { _type: 'related', post: 'p2' },
        { _type: 'galeria', images: ['m3', 'm1'] },
        { _type: 'descarga', pdf: 'm4' },
        { _type: 'unknown', post: 'p3' }
      ]
    })).toEqual({ relations: ['c1', 't1', 't2', 'a1', 'p1', 'p2'], media: ['m1', 'm2', 'm3', 'm4'] })
  })

  it('ignores empty or malformed data', () => {
    expect(documentReferences(fields, null)).toEqual({ relations: [], media: [] })
    expect(documentReferences(fields, { category: '', tags: 'nope', items: 'x', cover: 3 })).toEqual({ relations: [], media: [] })
  })
})
