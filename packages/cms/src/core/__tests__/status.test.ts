import { describe, expect, it } from 'vitest'
import { DISPLAY_STATUSES, displayStatus, isDisplayStatus } from '../status'

describe('displayStatus', () => {
  it('reads "incomplete" only for pending documents with missing content', () => {
    expect(displayStatus('new', true)).toBe('incomplete')
    expect(displayStatus('changed', true)).toBe('incomplete')
    expect(displayStatus('new', false)).toBe('new')
    expect(displayStatus('hidden', true)).toBe('hidden')
    expect(displayStatus('published', true)).toBe('published')
    expect(displayStatus('unpublishing', true)).toBe('unpublishing')
  })

  it('recognizes every status the panel can filter by', () => {
    expect(DISPLAY_STATUSES.every(isDisplayStatus)).toBe(true)
    expect(isDisplayStatus('incomplete')).toBe(true)
    expect(isDisplayStatus('pending')).toBe(false)
    expect(isDisplayStatus(null)).toBe(false)
  })
})
