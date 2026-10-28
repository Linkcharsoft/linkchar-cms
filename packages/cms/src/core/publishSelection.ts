import type { TranslatorType } from './i18n/types'

export interface SelectionDependencyType {
  id: string
  name: string
}

// A live URL this change would take; `freed` says the holder's own pending change releases it when ticked too.
export interface UrlConflictType {
  locale: string
  path: string
  takenBy: SelectionDependencyType
  freed: boolean
}

interface SelectableChangeType {
  warnings: string[]
  pendingRefs: SelectionDependencyType[]
  fixedUsers: SelectionDependencyType[]
  urlConflicts?: UrlConflictType[]
}

// The warnings of a change given what is ticked: the server computes them as if everything ready went out.
export const selectionWarnings = (change: SelectableChangeType, selected: ReadonlySet<string>, t: TranslatorType['t']) => [
  ...change.warnings,
  ...change.pendingRefs.filter(ref => !selected.has(ref.id)).map(ref => t('relations.notSelected', { name: ref.name })),
  ...change.fixedUsers.filter(user => !selected.has(user.id)).map(user => t('relations.usedLive', { name: user.name })),
  ...(change.urlConflicts ?? []).filter(conflict => conflict.freed && !selected.has(conflict.takenBy.id))
    .map(conflict => t('publishPanel.urlFreedBy', { path: conflict.path, name: conflict.takenBy.name }))
]

// Conflicts this selection does not free: the publish would fail on them.
export const unfreedConflicts = (changes: { id: string, urlConflicts?: UrlConflictType[] }[], selected: ReadonlySet<string>) => {
  const pairs = new Map(changes.flatMap(change => (change.urlConflicts ?? [])
    .filter(conflict => !(conflict.freed && selected.has(conflict.takenBy.id)))
    .map(conflict => [`${change.id} ${conflict.takenBy.id}`, { id: change.id, takenBy: conflict.takenBy.id }])))
  return [...pairs.values()]
}
