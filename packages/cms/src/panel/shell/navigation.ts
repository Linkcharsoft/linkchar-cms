import { textContext } from '../../core/config'
import { panelPaths } from '../../core/paths'
import { hasRole } from '../../core/roles'
import { resolveText } from '../../core/text'
import type { CmsConfigType } from '../../core/config'
import type { CollectionEntry, SchemaEntry } from '../../core/define'
import type { RoleType } from '../../core/roles'

export interface NavItemType {
  label: string
  href: string
  icon: string
  // Other sections that also highlight this item (a collection's tabs).
  matches?: string[]
  external?: boolean
}

export interface NavGroupType {
  label: string | null
  items: NavItemType[]
}

export interface CollectionTabType {
  id: string
  label: string
  href: string
}

const entriesOf = (config: CmsConfigType) => Object.entries(config.schema as Record<string, SchemaEntry>)

const collectionsOf = (config: CmsConfigType) =>
  entriesOf(config).filter((pair): pair is [string, CollectionEntry] => pair[1].kind === 'collection')

const childrenOf = (config: CmsConfigType, parentId: string) => collectionsOf(config).filter(([, entry]) => entry.under === parentId)

// Fixed menu items. Help texts and tours name places through these, never with literals.
export const navItems = (config: CmsConfigType, locale = config.panelLocale) => {
  const { t } = textContext(config, locale).translator
  const paths = panelPaths(config)
  return {
    overview: { label: t('nav.overview'), href: paths.home, icon: 'pi-home' },
    pages: { label: t('nav.pages'), href: paths.pages, icon: 'pi-file' },
    media: { label: t('nav.media'), href: paths.media, icon: 'pi-images' },
    users: { label: t('nav.users'), href: paths.users, icon: 'pi-users' },
    activity: { label: t('nav.activity'), href: paths.activity, icon: 'pi-history' },
    trash: { label: t('nav.trash'), href: paths.trash, icon: 'pi-trash' }
  } satisfies Record<string, NavItemType>
}

// A collection and the ones under it, as tabs of one screen ("Blog": Posts · Categories · Authors).
export const collectionTabs = (config: CmsConfigType, entryId: string): CollectionTabType[] => {
  const ctx = textContext(config)
  const paths = panelPaths(config)
  const collections = collectionsOf(config)
  const entry = collections.find(([id]) => id === entryId)?.[1]
  const rootId = entry?.under ?? entryId
  const root = collections.find(([id]) => id === rootId)?.[1]
  const children = childrenOf(config, rootId)
  if (!root || children.length === 0) return []

  return [
    { id: rootId, label: resolveText(root.tabLabel ?? root.label, ctx), href: paths.collection(rootId) },
    ...children.map(([id, child]) => ({ id, label: resolveText(child.label, ctx), href: paths.collection(id) }))
  ]
}

// How an entry is reached from the menu: "Blog › Authors", "Pages › Home", "Site settings".
export const entryNavLabel = (config: CmsConfigType, entryId: string): string => {
  const ctx = textContext(config)
  const entry = entriesOf(config).find(([id]) => id === entryId)?.[1]
  if (!entry) return entryId
  if (entry.kind === 'page') return `${navItems(config).pages.label} › ${resolveText(entry.label, ctx)}`
  if (entry.kind === 'collection' && entry.under) {
    const parent = collectionsOf(config).find(([id]) => id === entry.under)?.[1]
    return parent ? `${resolveText(parent.label, ctx)} › ${resolveText(entry.label, ctx)}` : resolveText(entry.label, ctx)
  }
  return resolveText(entry.label, ctx)
}

// The project's extensions for one menu group that this role may see.
const extensionItems = (config: CmsConfigType, role: RoleType, group: 'content' | 'site' | 'admin'): NavItemType[] => {
  const ctx = textContext(config)
  const paths = panelPaths(config)
  return config.extensions
    .filter(extension => (extension.group ?? 'content') === group && hasRole(role, extension.minRole ?? (group === 'admin' ? 'admin' : 'editor')))
    .map(extension => ({
      label: resolveText(extension.label, ctx),
      href: paths.extension(extension.id),
      icon: extension.icon ?? 'pi-th-large',
      external: !!extension.href
    }))
}

// The menu comes from the schema: pages are listed in Pages, top-level collections go to Content,
// singletons to Site, and the project's extensions to the group they ask for. Publishing lives in the header.
export const buildPanelNav = (config: CmsConfigType, role: RoleType): NavGroupType[] => {
  const ctx = textContext(config)
  const { t } = ctx.translator
  const paths = panelPaths(config)
  const items = navItems(config)
  const entries = entriesOf(config)

  return [
    { label: null, items: [items.overview] },
    {
      label: t('nav.groups.content'),
      items: [
        ...(entries.some(([, entry]) => entry.kind === 'page') ? [items.pages] : []),
        ...collectionsOf(config).filter(([, entry]) => !entry.under).map(([id, entry]) => ({
          label: resolveText(entry.label, ctx),
          href: paths.collection(id),
          icon: entry.icon ?? 'pi-list',
          matches: childrenOf(config, id).map(([childId]) => paths.collection(childId))
        })),
        items.media,
        ...extensionItems(config, role, 'content')
      ]
    },
    {
      label: t('nav.groups.site'),
      items: [
        ...entries.filter(([, entry]) => entry.kind === 'singleton').map(([id, entry]) => ({
          label: resolveText(entry.label, ctx),
          href: paths.site(id),
          icon: entry.icon ?? 'pi-cog'
        })),
        ...extensionItems(config, role, 'site')
      ]
    },
    {
      label: t('nav.groups.admin'),
      items: [...(hasRole(role, 'admin') ? [items.users, items.activity] : []), ...extensionItems(config, role, 'admin')]
    },
    { label: null, items: [items.trash] }
  ].filter(group => group.items.length > 0)
}
