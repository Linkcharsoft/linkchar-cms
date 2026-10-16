import { isRole } from './roles'
import type { TranslatorType } from './i18n/types'

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

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const count = (value: unknown) => (typeof value === 'number' ? value : 0)

export const isActivityAction = (value: string): value is ActivityActionType => Object.hasOwn(ACTIVITY_ACTIONS, value)

export const activityLabel = (action: string, { translate }: TranslatorType) =>
  isActivityAction(action) ? translate(`activity.actions.${action}`) : action

const PUBLISH_COUNTS = ['published', 'removed', 'redirects'] as const

// What a row is about beyond its subject link, in the panel language.
export const activityDetail = (action: string, details: Record<string, unknown>, { t }: TranslatorType): string | null => {
  if (action === 'site.publish') {
    return PUBLISH_COUNTS
      .filter(key => count(details[key]) > 0)
      .map(key => t(`activity.detail.${key}`, { count: count(details[key]) }))
      .join(' · ') || null
  }
  if (action.startsWith('media.')) return text(details.path).split('/').pop() || null
  if (action === 'user.invite' || action === 'user.update') {
    const role = isRole(details.role) ? t(`roles.${details.role}`) : ''
    return [text(details.email), role].filter(Boolean).join(' · ') || null
  }
  if (action.startsWith('user.')) return text(details.email) || null
  if (action.startsWith('auth.mfa_')) return text(details.device) || null
  if (action === 'auth.login') return details.mfa ? t('activity.detail.withMfa') : null
  if (action === 'profile.update') {
    if (text(details.name)) return t('activity.detail.name', { name: text(details.name) })
    if (details.photo === 'removed') return t('activity.detail.photoRemoved')
    return details.photo ? t('activity.detail.photoChanged') : null
  }
  return null
}
