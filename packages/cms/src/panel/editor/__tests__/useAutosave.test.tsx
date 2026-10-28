import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useAutosave, { type AutosaveOutcomeType } from '../useAutosave'

interface ValuesType {
  title: string
}

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => { resolve = res })
  return { promise, resolve }
}

const setup = (options: { outcome?: AutosaveOutcomeType, delay?: number, enabled?: boolean } = {}) => {
  const save = vi.fn(async (): Promise<AutosaveOutcomeType> => options.outcome ?? 'saved')
  const hook = renderHook(
    ({ values, enabled }: { values: ValuesType, enabled?: boolean }) => useAutosave({ values, save, delay: options.delay ?? 2000, enabled }),
    { initialProps: { values: { title: 'Casa' }, enabled: options.enabled } }
  )
  const change = (title: string, enabled = options.enabled) => act(() => hook.rerender({ values: { title }, enabled }))
  const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
  return { ...hook, save, change, tick }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useAutosave', () => {
  it('saves the latest values once, delay ms after the last change', async () => {
    const { result, save, change, tick } = setup()
    expect(result.current.status).toBe('idle')
    expect(result.current.isDirty).toBe(false)

    await change('Casa nueva')
    expect(result.current.status).toBe('pending')
    expect(result.current.isDirty).toBe(true)

    await tick(1500)
    await change('Casa nueva y grande')
    await tick(1500)
    expect(save).not.toHaveBeenCalled()

    await tick(500)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'Casa nueva y grande' })
    expect(result.current.status).toBe('saved')
    expect(result.current.isDirty).toBe(false)
    expect(result.current.savedAt).toBeInstanceOf(Date)
  })

  it('queues a change made while a save is in flight and saves it right after', async () => {
    const first = deferred<AutosaveOutcomeType>()
    const save = vi.fn<(values: ValuesType) => Promise<AutosaveOutcomeType>>()
    save.mockReturnValueOnce(first.promise).mockResolvedValue('saved')
    const { result, rerender } = renderHook(
      ({ values }: { values: ValuesType }) => useAutosave({ values, save, delay: 100 }),
      { initialProps: { values: { title: 'Casa' } } }
    )

    await act(() => rerender({ values: { title: 'Casa nueva' } }))
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(result.current.status).toBe('saving')

    await act(() => rerender({ values: { title: 'Casa nueva y grande' } }))
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(save).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('saving')

    await act(async () => {
      first.resolve('saved')
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith({ title: 'Casa nueva y grande' })
    expect(result.current.status).toBe('saved')
    expect(result.current.isDirty).toBe(false)
  })

  it('keeps the document dirty after invalid, conflict or error outcomes, and treats a thrown save as an error', async () => {
    for (const outcome of ['invalid', 'conflict', 'error'] as const) {
      const { result, change, tick, unmount } = setup({ outcome })
      await change('Casa nueva')
      await tick(2000)
      expect(result.current.status).toBe(outcome)
      expect(result.current.isDirty).toBe(true)
      expect(result.current.savedAt).toBeNull()
      unmount()
    }

    const save = vi.fn(async (): Promise<AutosaveOutcomeType> => { throw new Error('offline') })
    const { result, rerender } = renderHook(
      ({ values }: { values: ValuesType }) => useAutosave({ values, save, delay: 100 }),
      { initialProps: { values: { title: 'Casa' } } }
    )
    await act(() => rerender({ values: { title: 'Casa nueva' } }))
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(result.current.status).toBe('error')
    expect(result.current.isDirty).toBe(true)

    const partial = setup({ outcome: 'partial' })
    await partial.change('Casa nueva')
    await partial.tick(2000)
    expect(partial.result.current.status).toBe('partial')
    expect(partial.result.current.isDirty).toBe(false)
    expect(partial.result.current.savedAt).toBeInstanceOf(Date)
  })

  it('flush saves right away without waiting for the delay and resolves true when nothing is left', async () => {
    const { result, save, change } = setup()
    let flushed: boolean | undefined
    await act(async () => { flushed = await result.current.flush() })
    expect(flushed).toBe(true)
    expect(save).not.toHaveBeenCalled()

    await change('Casa nueva')
    await act(async () => { flushed = await result.current.flush() })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'Casa nueva' })
    expect(flushed).toBe(true)
    expect(result.current.status).toBe('saved')

    const failing = setup({ outcome: 'conflict' })
    await failing.change('Otra casa')
    await act(async () => { flushed = await failing.result.current.flush() })
    expect(flushed).toBe(false)
    expect(failing.result.current.isDirty).toBe(true)
  })

  it('markSaved adopts the given values as the new baseline without saving them', async () => {
    const { result, save, change, tick } = setup()
    await change('Casa nueva')
    expect(result.current.isDirty).toBe(true)

    act(() => result.current.markSaved({ title: 'Casa nueva' }))
    expect(result.current.status).toBe('idle')
    expect(result.current.isDirty).toBe(false)

    await tick(2000)
    expect(save).not.toHaveBeenCalled()

    await change('Casa nueva y grande')
    await tick(2000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'Casa nueva y grande' })
  })

  it('does not schedule saves while disabled and picks up the change once enabled', async () => {
    const { result, save, change, tick } = setup({ enabled: false })
    await change('Casa nueva', false)
    await tick(2000)
    expect(save).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
    expect(result.current.isDirty).toBe(true)

    await change('Casa nueva', true)
    expect(result.current.status).toBe('pending')
    await tick(2000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('saved')
  })

  it('guards beforeunload only while there are unsaved changes', async () => {
    const { change, tick } = setup()
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(unload()).toBe(false)

    await change('Casa nueva')
    expect(unload()).toBe(true)

    await tick(2000)
    expect(unload()).toBe(false)
  })
})

describe('useAutosave retries', () => {
  it('tries a failed save again with growing delays, then waits for retry() or an edit', async () => {
    const save = vi.fn(async (): Promise<AutosaveOutcomeType> => 'error')
    const { result, rerender } = renderHook(
      ({ values }: { values: ValuesType }) => useAutosave({ values, save, delay: 100 }),
      { initialProps: { values: { title: 'Casa' } } }
    )
    await act(() => rerender({ values: { title: 'Casa nueva' } }))
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(save).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('error')

    await act(() => vi.advanceTimersByTimeAsync(2999))
    expect(save).toHaveBeenCalledTimes(1)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(save).toHaveBeenCalledTimes(2)
    await act(() => vi.advanceTimersByTimeAsync(6000))
    expect(save).toHaveBeenCalledTimes(3)
    await act(() => vi.advanceTimersByTimeAsync(12000))
    expect(save).toHaveBeenCalledTimes(4)
    await act(() => vi.advanceTimersByTimeAsync(24000))
    expect(save).toHaveBeenCalledTimes(5)
    await act(() => vi.advanceTimersByTimeAsync(60000))
    expect(save).toHaveBeenCalledTimes(5)

    save.mockResolvedValue('saved')
    act(() => result.current.retry())
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(save).toHaveBeenCalledTimes(6)
    expect(result.current.status).toBe('saved')
    expect(result.current.isDirty).toBe(false)
  })

  it('does not retry invalid or conflicting saves on its own', async () => {
    for (const outcome of ['invalid', 'conflict'] as const) {
      const { save, change, tick, unmount } = setup({ outcome })
      await change('Casa nueva')
      await tick(2000)
      await tick(60000)
      expect(save).toHaveBeenCalledTimes(1)
      unmount()
    }
  })
})
