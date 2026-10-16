import { describe, expect, it } from 'vitest'
import { ACTIVITY_ACTIONS, activityDetail, activityLabel } from '../activity'
import { createTranslator } from '../i18n/translator'

const es = createTranslator({ locale: 'es' })
const en = createTranslator({ locale: 'en' })

describe('activity texts', () => {
  it('labels every action in both catalogs', () => {
    for (const action of Object.keys(ACTIVITY_ACTIONS)) {
      expect(activityLabel(action, es)).not.toBe(`activity.actions.${action}`)
      expect(activityLabel(action, en)).not.toBe(`activity.actions.${action}`)
    }
    expect(activityLabel('document.trash', es)).toBe('Mandó a la papelera')
    expect(activityLabel('document.trash', en)).toBe('Moved to the trash')
    expect(activityLabel('legacy.action', es)).toBe('legacy.action')
  })

  it('summarizes what each row is about', () => {
    expect(activityDetail('site.publish', { published: 3, removed: 1, redirects: 0 }, es)).toBe('3 publicados · 1 despublicado')
    expect(activityDetail('site.publish', {}, es)).toBeNull()
    expect(activityDetail('media.upload', { path: 'blog/2026/abc.webp' }, es)).toBe('abc.webp')
    expect(activityDetail('user.invite', { email: 'ana@estudio.com', role: 'editor' }, es)).toBe('ana@estudio.com · Editor')
    expect(activityDetail('user.update', { email: 'ana@estudio.com', role: 'admin' }, en)).toBe('ana@estudio.com · Administrator')
    expect(activityDetail('user.deactivate', { email: 'ana@estudio.com' }, es)).toBe('ana@estudio.com')
    expect(activityDetail('auth.mfa_enroll', { device: 'Celular de Ana' }, es)).toBe('Celular de Ana')
    expect(activityDetail('auth.login', { mfa: true }, en)).toBe('With two-step verification')
    expect(activityDetail('auth.login', {}, es)).toBeNull()
    expect(activityDetail('profile.update', { name: 'Ana' }, es)).toBe('Nombre: Ana')
    expect(activityDetail('profile.update', { photo: 'removed' }, es)).toBe('Quitó su foto')
    expect(activityDetail('document.create', { type: 'posts' }, es)).toBeNull()
  })
})
