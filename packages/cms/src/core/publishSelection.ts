import type { TranslatorType } from './i18n/types'

export interface SelectionDependencyType {
  id: string
  name: string
}

interface SelectableChangeType {
  warnings: string[]
  pendingRefs: SelectionDependencyType[]
  fixedUsers: SelectionDependencyType[]
}

// The warnings of a change given what is ticked: the server computes them as if everything ready went out.
export const selectionWarnings = (change: SelectableChangeType, selected: ReadonlySet<string>, t: TranslatorType['t']) => [
  ...change.warnings,
  ...change.pendingRefs.filter(ref => !selected.has(ref.id)).map(ref => t('relations.notSelected', { name: ref.name })),
  ...change.fixedUsers.filter(user => !selected.has(user.id)).map(user => t('relations.usedLive', { name: user.name }))
]
