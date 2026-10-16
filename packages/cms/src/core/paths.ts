import type { CmsConfigType } from './config'
import type { SchemaEntry } from './define'

export interface PanelPathsType {
  home: string
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
  // Reachable without a session.
  publicPaths: string[]
  // A signed-in user is sent to the panel home instead.
  guestOnlyPaths: string[]
}

const cache = new WeakMap<CmsConfigType, PanelPathsType>()

// The segments are the ones Hologramas already serves, so moving it to the package changes no URL.
export const panelPaths = (config: CmsConfigType): PanelPathsType => {
  const cached = cache.get(config)
  if (cached) return cached

  const base = config.basePath
  const at = (segment: string) => `${base}/${segment}`
  const page = (pageId: string, section?: string) => `${at('paginas')}/${pageId}${section ? `#${section}` : ''}`
  const site = (entryId: string) => `${at('sitio')}/${entryId}`
  const collection = (entryId: string) => `${at('colecciones')}/${entryId}`
  const document = (entryId: string, id: string) => `${collection(entryId)}/${id}`
  const login = at('login')
  const passwordRecovery = at('recuperar-contrasena')

  const paths: PanelPathsType = {
    home: base,
    pages: at('paginas'),
    media: at('media'),
    publish: at('publicar'),
    trash: at('papelera'),
    account: at('cuenta'),
    users: at('usuarios'),
    activity: at('actividad'),
    login,
    passwordRecovery,
    passwordReset: at('restablecer-contrasena'),
    acceptInvite: at('invitacion'),
    mfaVerify: at('verificacion'),
    authConfirm: at('auth/confirm'),
    signout: at('auth/signout'),
    site,
    page,
    collection,
    document,
    publishItem: documentId => `${at('publicar')}${documentId ? `?doc=${documentId}` : ''}`,
    entry: (kind, entryId, id) => {
      if (kind === 'page') return page(entryId)
      if (kind === 'singleton') return site(entryId)
      return id ? document(entryId, id) : collection(entryId)
    },
    publicPaths: [login, passwordRecovery, at('auth')],
    guestOnlyPaths: [login, passwordRecovery]
  }

  cache.set(config, paths)
  return paths
}
