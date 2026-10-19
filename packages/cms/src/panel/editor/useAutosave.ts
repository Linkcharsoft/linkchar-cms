'use client'
import { useEffect, useRef, useState } from 'react'

// 'partial': saved, except a part the server reported back (a URL another document has).
export type AutosaveOutcomeType = 'saved' | 'partial' | 'invalid' | 'conflict' | 'error'

export type AutosaveStatusType = 'idle' | 'pending' | 'saving' | AutosaveOutcomeType

interface Options<T> {
  values: T
  save: (values: T) => Promise<AutosaveOutcomeType>
  delay?: number
  enabled?: boolean
}

interface AutosaveType<T> {
  status: AutosaveStatusType
  savedAt: Date | null
  isDirty: boolean
  // Resolves once nothing is in flight: true when every change got saved.
  flush: () => Promise<boolean>
  // New baseline after loading values from the server (e.g. when resolving a conflict).
  markSaved: (values: T) => void
}

// Saves `delay` ms after the last change, one request in flight at a time, and guards unload while unsaved.
const useAutosave = <T>({ values, save, delay = 2000, enabled = true }: Options<T>): AutosaveType<T> => {
  const serialized = JSON.stringify(values)
  const [status, setStatus] = useState<AutosaveStatusType>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [baseline, setBaseline] = useState(serialized)

  const latest = useRef({ values, serialized, save })
  const baselineRef = useRef(serialized)
  const saving = useRef(false)
  const pending = useRef(false)
  const inflight = useRef<Promise<boolean>>(Promise.resolve(true))

  useEffect(() => {
    latest.current = { values, serialized, save }
  })

  const flush = async (): Promise<boolean> => {
    if (saving.current) {
      pending.current = true
      return inflight.current
    }

    const { values: snapshot, serialized: snapshotJson, save: run } = latest.current
    if (snapshotJson === baselineRef.current) return true

    inflight.current = saveSnapshot(snapshot, snapshotJson, run)
    return inflight.current
  }

  const saveSnapshot = async (snapshot: T, snapshotJson: string, run: Options<T>['save']): Promise<boolean> => {
    saving.current = true
    setStatus('saving')
    let outcome: AutosaveOutcomeType

    try {
      outcome = await run(snapshot)
    } catch {
      outcome = 'error'
    }

    saving.current = false
    setStatus(outcome)

    if (outcome === 'saved' || outcome === 'partial') {
      baselineRef.current = snapshotJson
      setBaseline(snapshotJson)
      setSavedAt(new Date())
      if (pending.current) {
        pending.current = false
        return flush()
      }
      return true
    }

    pending.current = false
    return false
  }

  useEffect(() => {
    if (!enabled || serialized === baselineRef.current) return
    setStatus(current => (current === 'saving' ? current : 'pending'))
    const timer = setTimeout(() => void flush(), delay)
    return () => clearTimeout(timer)
  }, [serialized, enabled, delay])

  const isDirty = serialized !== baseline || status === 'saving'

  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  const markSaved = (next: T) => {
    const json = JSON.stringify(next)
    baselineRef.current = json
    setBaseline(json)
    setStatus('idle')
  }

  return { status, savedAt, isDirty, flush, markSaved }
}

export default useAutosave
