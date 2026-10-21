import { act, cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import { announceSaved } from '../../client/savedEvent'
import PublishStatus from '../PublishStatus/PublishStatus'
import type { PendingCountsType } from '../../../server/publish'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))

afterEach(cleanup)

const render = (counts: PendingCountsType) =>
  renderPanel(<PublishStatus latest={null} counts={counts} />, { actions: { getPublishStatus: async () => ({ latest: null, counts }) } as never })

describe('PublishStatus', () => {
  it('counts only the changes the next publish takes', () => {
    render({ ready: 3, incomplete: 1 })
    expect(screen.getByTestId('publish-count').textContent).toBe('3')
    expect(screen.getByLabelText('3 cambios pendientes')).toBeTruthy()
  })

  it('says why nothing is ready when every change is incomplete', () => {
    render({ ready: 0, incomplete: 2 })
    expect(screen.queryByTestId('publish-count')).toBeNull()
    expect(screen.getByText('2 cambios incompletos: no salen hasta completarlos')).toBeTruthy()
  })

  it('refreshes the count when the editor saves', async () => {
    const getPublishStatus = vi.fn(async () => ({ latest: null, counts: { ready: 1, incomplete: 0 } }))
    renderPanel(<PublishStatus latest={null} counts={{ ready: 0, incomplete: 1 }} />, { actions: { getPublishStatus } as never })
    await waitFor(() => expect(getPublishStatus).toHaveBeenCalledTimes(1))
    await act(async () => { announceSaved() })
    await waitFor(() => expect(screen.getByTestId('publish-count').textContent).toBe('1'))
  })

  it('shows nothing extra when there are no pending changes', () => {
    render({ ready: 0, incomplete: 0 })
    expect(screen.queryByTestId('publish-count')).toBeNull()
    expect(screen.queryByText(/incompleto/)).toBeNull()
  })
})
