import { localePrefix } from './urls'
import type { CmsConfigType } from './config'
import type { SchemaEntry } from './define'

export interface PanelPathsType {
  home: string
  // The published site's front page: the default locale's prefix when it has one.
  siteHome: string
  pages: string
  media: string
  publish: string
  trash: string
  account: string
  users: string
  activity: string
  login: string
  passwordRecovery: string
  passwordReset: string
  acceptInvite: string
  mfaVerify: string
  authConfirm: string
  signout: string
  site: (entryId: string) => string
  // `section` opens and scrolls to that section of the page editor.
  page: (pageId: string, section?: string) => string
  collection: (entryId: string) => string
  document: (entryId: string, id: string) => string
  // `documentId` highlights that change in the list.
  publishItem: (documentId?: string) => string
  // Where an entry is edited: a page or singleton editor, a collection list, or one collection document.
  entry: (kind: SchemaEntry['kind'], entryId: string, id?: string) => string
  // One field of the editor in one language: "/dashboard/paginas/home?locale=en#hero.title".
  field: (kind: SchemaEntry['kind'], entryId: string, id: string | undefined, target: { field: string, locale: string | null }) => string
  // A project screen or link declared in `extensions`.
  extension: (id: string) => string
  // Reachable without a session.
  publicPaths: string[]
  // A signed-in user is sent to the panel home instead.
  guestOnlyPaths: string[]
}

export type PanelSegmentType =
  | 'pages' | 'site' | 'collections' | 'media' | 'publish' | 'trash' | 'account' | 'users' | 'activity'
  | 'login' | 'passwordRecovery' | 'passwordReset' | 'acceptInvite' | 'mfaVerify'

// Hologramas' segments, so moving it to the package changes no URL.
export const DEFAULT_PANEL_SEGMENTS: Readonly<Record<PanelSegmentType, string>> = {
  pages: 'paginas',
  site: 'sitio',
  collections: 'colecciones',
  media: 'media',
  publish: 'publicar',
  trash: 'papelera',
  account: 'cuenta',
  users: 'usuarios',
  activity: 'actividad',
  login: 'login',
  passwordRecovery: 'recuperar-contrasena',
  passwordReset: 'restablecer-contrasena',
  acceptInvite: 'invitacion',
  mfaVerify: 'verificacion'
}

// Holds the email link and sign-out route handlers.
export const AUTH_SEGMENT = 'auth'

const cache = new WeakMap<CmsConfigType, PanelPathsType>()

export const panelPaths = (config: CmsConfigType): PanelPathsType => {
  const cached = cache.get(config)
  if (cached) return cached

  const base = config.basePath
  const at = (segment: PanelSegmentType) => `${base}/${config.paths[segment]}`
  const page = (pageId: string, section?: string) => `${at('pages')}/${pageId}${section ? `#${section}` : ''}`
  const site = (entryId: string) => `${at('site')}/${entryId}`
  const collection = (entryId: string) => `${at('collections')}/${entryId}`
  const document = (entryId: string, id: string) => `${collection(entryId)}/${id}`
  const login = at('login')
  const passwordRecovery = at('passwordRecovery')
  const auth = `${base}/${AUTH_SEGMENT}`
  const entry: PanelPathsType['entry'] = (kind, entryId, id) => {
    if (kind === 'page') return page(entryId)
    if (kind === 'singleton') return site(entryId)
    return id ? document(entryId, id) : collection(entryId)
  }

  const paths: PanelPathsType = {
    home: base,
    siteHome: localePrefix(config, config.defaultLocale) || '/',
    pages: at('pages'),
    media: at('media'),
    publish: at('publish'),
    trash: at('trash'),
    account: at('account'),
    users: at('users'),
    activity: at('activity'),
    login,
    passwordRecovery,
    passwordReset: at('passwordReset'),
    acceptInvite: at('acceptInvite'),
    mfaVerify: at('mfaVerify'),
    authConfirm: `${auth}/confirm`,
    signout: `${auth}/signout`,
    site,
    page,
    collection,
    document,
    publishItem: documentId => `${at('publish')}${documentId ? `?doc=${documentId}` : ''}`,
    entry,
    field: (kind, entryId, id, { field, locale }) => {
      const query = locale && locale !== config.defaultLocale ? `?locale=${locale}` : ''
      return `${entry(kind, entryId, id)}${query}#${field}`
    },
    extension: id => {
      const found = config.extensions.find(extension => extension.id === id)
      return found?.href ?? (found?.path ? `${base}/${found.path}` : base)
    },
    publicPaths: [login, passwordRecovery, auth],
    guestOnlyPaths: [login, passwordRecovery]
  }

  cache.set(config, paths)
  return paths
}
