export type ActivityGroupType = 'content' | 'publishing' | 'media' | 'users' | 'account'

export const ACTIVITY_GROUPS: readonly ActivityGroupType[] = ['content', 'publishing', 'media', 'users', 'account']

export const ACTIVITY_ACTIONS = {
  'document.create': 'content',
  'document.duplicate': 'content',
  'document.trash': 'content',
  'document.untrash': 'content',
  'document.purge': 'content',
  'document.restore': 'content',
  'document.discard': 'content',
  'document.show': 'publishing',
  'document.hide': 'publishing',
  'site.publish': 'publishing',
  'media.upload': 'media',
  'media.trash': 'media',
  'media.purge': 'media',
  'user.invite': 'users',
  'user.invite_resend': 'users',
  'user.invite_delete': 'users',
  'user.update': 'users',
  'user.deactivate': 'users',
  'user.reactivate': 'users',
  'user.mfa_reset': 'users',
  'auth.login': 'account',
  'auth.password_change': 'account',
  'auth.mfa_enroll': 'account',
  'auth.mfa_unenroll': 'account',
  'profile.update': 'account'
} as const satisfies Record<string, ActivityGroupType>

export type ActivityActionType = keyof typeof ACTIVITY_ACTIONS

export const actionsInGroup = (group: ActivityGroupType): ActivityActionType[] =>
  (Object.keys(ACTIVITY_ACTIONS) as ActivityActionType[]).filter(action => ACTIVITY_ACTIONS[action] === group)

export const isActivityGroup = (value: string): value is ActivityGroupType => (ACTIVITY_GROUPS as readonly string[]).includes(value)
