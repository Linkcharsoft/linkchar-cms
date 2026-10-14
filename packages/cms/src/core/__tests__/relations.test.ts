import { describe, expect, it } from 'vitest'
import { referenceWarnings, relationIssue, relationNotice } from '../relations'

describe('relationIssue', () => {
  it('is quiet when the item is on the site', () => {
    expect(relationIssue({ label: 'Ana', kind: 'Autor', status: 'published', trashed: false })).toBeNull()
    expect(relationIssue({ label: 'Ana', kind: 'Autor', status: 'changed', trashed: false })).toBeNull()
  })

  it('warns when the item will not appear', () => {
    expect(relationIssue({ label: 'Ana', kind: 'Autor', status: 'hidden', trashed: false })).toMatchObject({ tag: 'Oculto', missing: true })
    expect(relationIssue({ label: 'Ana', kind: 'Autor', status: 'unpublishing', trashed: false })).toMatchObject({ missing: true })
    expect(relationIssue({ label: 'Ana', kind: 'Autor', status: 'published', trashed: true })).toMatchObject({ tag: 'En la papelera', missing: true })
  })

  it('tells that a new item comes out with the next publish', () => {
    const ref = { label: 'Ana', kind: 'Autor', status: 'new', trashed: false } as const
    const issue = relationIssue(ref)!
    expect(issue.missing).toBe(false)
    expect(relationNotice(ref, issue)).toBe('"Ana" todavía no está publicado: sale con la próxima publicación.')
    expect(relationNotice(ref, issue, true)).toBe('"Ana" (autor) todavía no está publicado: sale con la próxima publicación.')
  })
})

describe('referenceWarnings', () => {
  const refs = {
    ana: { label: 'Ana', kind: 'Autor', status: 'hidden', trashed: false },
    nueva: { label: 'Nueva', kind: 'Categoría', status: 'new', trashed: false },
    ok: { label: 'Ok', kind: 'Autor', status: 'published', trashed: false }
  } as const

  it('names what will not appear and why', () => {
    expect(referenceWarnings(['ana', 'ok', 'borrada'], refs, () => true)).toEqual([
      '"Ana" (autor) está oculto: no va a aparecer en el sitio.',
      'Un contenido elegido ya no existe: no va a aparecer en el sitio.'
    ])
  })

  it('lets a new item through only when it comes out in the same publish', () => {
    expect(referenceWarnings(['nueva'], refs, () => true)).toEqual([])
    expect(referenceWarnings(['nueva'], refs, () => false)).toEqual([
      '"Nueva" (categoría) no se publica hasta completar sus campos: no va a aparecer en el sitio.'
    ])
  })
})
