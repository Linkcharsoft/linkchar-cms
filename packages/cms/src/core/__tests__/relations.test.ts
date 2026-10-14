import { describe, expect, it } from 'vitest'
import { relationIssue, relationNotice } from '../relations'

describe('relationIssue', () => {
  it('is quiet when the item is on the site', () => {
    expect(relationIssue({ label: 'Ana', status: 'published', trashed: false })).toBeNull()
    expect(relationIssue({ label: 'Ana', status: 'changed', trashed: false })).toBeNull()
  })

  it('warns when the item will not appear', () => {
    expect(relationIssue({ label: 'Ana', status: 'hidden', trashed: false })).toMatchObject({ tag: 'Oculto', missing: true })
    expect(relationIssue({ label: 'Ana', status: 'unpublishing', trashed: false })).toMatchObject({ missing: true })
    expect(relationIssue({ label: 'Ana', status: 'published', trashed: true })).toMatchObject({ tag: 'En la papelera', missing: true })
  })

  it('tells that a new item comes out with the next publish', () => {
    const ref = { label: 'Ana', status: 'new', trashed: false } as const
    const issue = relationIssue(ref)!
    expect(issue.missing).toBe(false)
    expect(relationNotice(ref, issue)).toBe('"Ana" todavía no está publicado: sale con la próxima publicación.')
  })
})
