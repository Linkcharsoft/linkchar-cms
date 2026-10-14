type DataRecord = Record<string, unknown>

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Structural equality for JSON content. List item `_key`s are ignored: withDefaults makes up new ones
// for stored items that lack them, and two lists with the same content are the same edit.
export const sameContent = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => sameContent(item, b[index]))
  }
  if (!isRecord(a) || !isRecord(b)) return false

  const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter(key => key !== '_key'))
  return [...keys].every(key => sameContent(a[key], b[key]))
}

// Top-level keys (page sections, document fields) whose value differs from the last saved state.
export const changedKeys = (values: DataRecord, base: DataRecord): string[] =>
  [...new Set([...Object.keys(values), ...Object.keys(base)])].filter(key => !sameContent(values[key], base[key]))

export const pickKeys = (data: DataRecord, keys: string[]): DataRecord =>
  Object.fromEntries(keys.filter(key => key in data).map(key => [key, data[key]]))

export type MergeResultType =
  | { status: 'merged', data: DataRecord }
  | { status: 'conflict', keys: string[] }

// Applies the editor's changed keys over the stored content. A key conflicts only when someone else
// saved a different value for it since the editor loaded it (`base`); other keys merge freely.
export const mergePatch = (current: DataRecord, patch: DataRecord, base: DataRecord): MergeResultType => {
  const conflicts = Object.keys(patch).filter(key => !sameContent(current[key], base[key]))
  return conflicts.length > 0 ? { status: 'conflict', keys: conflicts } : { status: 'merged', data: { ...current, ...patch } }
}

export interface RebaseResultType {
  values: DataRecord
  base: DataRecord
  // Keys whose value came from someone else's save (their inputs need a remount).
  adopted: string[]
}

// After a successful save: take what others saved in keys the editor hasn't touched since `base`.
// Keys the editor did touch keep their old base, so the next save reports the conflict instead of overwriting.
export const rebase = (values: DataRecord, base: DataRecord, saved: DataRecord, patched: string[]): RebaseResultType => {
  const nextValues = { ...values }
  const nextBase = { ...base }
  const adopted: string[] = []

  for (const key of Object.keys(saved)) {
    if (patched.includes(key)) {
      nextBase[key] = saved[key]
      continue
    }
    if (sameContent(saved[key], base[key])) continue
    if (sameContent(values[key], base[key])) {
      nextValues[key] = saved[key]
      nextBase[key] = saved[key]
      adopted.push(key)
    }
  }

  return { values: nextValues, base: nextBase, adopted }
}
