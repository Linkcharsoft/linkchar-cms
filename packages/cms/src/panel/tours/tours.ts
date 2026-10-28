import { textContext } from '../../core/config'
import { pageSections, usedEntries } from '../../core/pages'
import { panelPaths } from '../../core/paths'
import { resolveText } from '../../core/text'
import { dataFields } from '../../core/walk'
import { buildPanelNav, entryNavLabel, navItems } from '../shell/navigation'
import type { CmsConfigType } from '../../core/config'
import type { CollectionEntry, PageEntry, SchemaEntry } from '../../core/define'
import type { DataField, FieldsRecord } from '../../core/fields'
import type { MessageKeyType } from '../../core/i18n/types'
import type { RelationField } from '../../core/kinds/relation'

export const TOUR_IDS = ['welcome', 'pages', 'page-editor', 'site', 'document', 'collection', 'media', 'publish', 'account'] as const

export type TourIdType = typeof TOUR_IDS[number]

export type TourSideType = 'top' | 'right' | 'bottom' | 'left'

export type TourAlignType = 'start' | 'center' | 'end'

interface PlacementType {
  side?: TourSideType
  align?: TourAlignType
}

export interface TourStepType extends PlacementType {
  // data-tour anchor; a step without one (or whose anchor isn't on screen) shows as a centered card.
  anchor?: string
  title: string
  description: string
}

// Where the card goes next to its anchor: beside the sidebar, under a header button (right-aligned), under a field.
const RIGHT: PlacementType = { side: 'right', align: 'start' }
const BELOW: PlacementType = { side: 'bottom', align: 'start' }
const BELOW_END: PlacementType = { side: 'bottom', align: 'end' }

export interface TourType {
  id: TourIdType
  title: string
  // Where Help sends the user to replay it; null when it only makes sense on a specific document.
  path: string | null
  matches: (pathname: string) => boolean
  steps: TourStepType[]
}

type StepKeyType = {
  [K in MessageKeyType]: K extends `tours.${infer S}.description` ? `tours.${S}.title` extends MessageKeyType ? S : never : never
}[MessageKeyType]

const exactly = (path: string) => (pathname: string) => pathname === path

// Segments after a prefix: 1 for a list (/colecciones/blog), 2 for a document (/colecciones/blog/123).
const depthUnder = (prefix: string, depth: number) => (pathname: string) =>
  pathname.startsWith(prefix) && pathname.slice(prefix.length).split('/').filter(Boolean).length === depth

const entriesOf = (config: CmsConfigType) => Object.entries(config.schema as Record<string, SchemaEntry>)

const findField = (fields: FieldsRecord, test: (field: DataField) => boolean): DataField | null => {
  for (const [, field] of dataFields(fields)) {
    if (test(field)) return field
    if (field.kind === 'group' || field.kind === 'list') {
      const nested = findField(field.fields, test)
      if (nested) return nested
    }
  }
  return null
}

// Tours follow the schema: entry ids, tabs and menu places come from it, so they hold for any project.
export const buildTours = (config: CmsConfigType): TourType[] => {
  const ctx = textContext(config)
  const { locale } = ctx
  const { t, translate } = ctx.translator
  const paths = panelPaths(config)
  const items = navItems(config)
  const entries = entriesOf(config)
  const listOf = (values: string[]) => new Intl.ListFormat(locale, { type: 'conjunction' }).format(values)
  const step = (key: StepKeyType, anchor?: string, placement: PlacementType = BELOW): TourStepType =>
    ({ ...(anchor ? { anchor, ...placement } : {}), title: translate(`tours.${key}.title`), description: translate(`tours.${key}.description`) })

  const pages = entries.filter((pair): pair is [string, PageEntry] => pair[1].kind === 'page')
  const singletons = entries.filter(([, entry]) => entry.kind === 'singleton')
  const collections = entries.filter((pair): pair is [string, CollectionEntry] => pair[1].kind === 'collection')
  const listed = collections.filter(([, entry]) => !entry.under)

  const menu = buildPanelNav(config, 'editor')
  const groupItems = (label: string) => menu.find(group => group.label === label)?.items.map(item => item.label) ?? []
  const navSentence = (key: 'content' | 'site', group: string) => {
    const labels = groupItems(group)
    return labels.length > 0 ? [t(`tours.welcome.nav.${key}`, { group, items: listOf(labels) })] : []
  }
  const contentGroup = t('nav.groups.content')
  const siteGroup = t('nav.groups.site')

  const used = pages.flatMap(([, page]) => usedEntries(config, pageSections(page.fields)))
  const related = collections
    .map(([, entry]) => findField(entry.fields, field => field.kind === 'relation' && entries.some(([id]) => id === field.to)))
    .find((field): field is RelationField => field?.kind === 'relation')
  const seoField = collections.map(([, entry]) => findField(entry.fields, field => field.kind === 'group' && !!field.seo)).find(Boolean)
  const hasSlug = collections.some(([, entry]) => !!entry.slugField)

  const tours: (TourType | null)[] = [
    {
      id: 'welcome',
      title: t('tours.welcome.title'),
      path: paths.home,
      matches: exactly(paths.home),
      steps: [
        step('welcome.intro'),
        {
          anchor: 'nav',
          ...RIGHT,
          title: t('tours.welcome.nav.title'),
          description: [...navSentence('content', contentGroup), ...navSentence('site', siteGroup)].join(' ')
        },
        step('welcome.tasks', 'overview-tasks'),
        step('welcome.alerts', 'overview-alerts'),
        step('welcome.pending', 'overview-publish'),
        ...(pages.length > 0
          ? [{
            anchor: 'overview-pages',
            ...BELOW,
            title: t('tours.welcome.pages.title', { pages: items.pages.label.toLocaleLowerCase(locale) }),
            description: t('tours.welcome.pages.description')
          }]
          : []),
        step('welcome.recent', 'overview-recent'),
        step('welcome.publish', 'publish', BELOW_END),
        step('welcome.viewSite', 'view-site', BELOW_END),
        { anchor: 'account', ...BELOW, title: t('tours.welcome.account.title'), description: t('tours.welcome.account.description', { account: t('shell.account') }) },
        { anchor: 'help', ...BELOW_END, title: t('tours.welcome.help.title'), description: t('tours.welcome.help.description', { help: t('help.button') }) }
      ]
    },
    pages.length > 0 ? {
      id: 'pages',
      title: t('tours.pages.title'),
      path: paths.pages,
      matches: exactly(paths.pages),
      steps: [
        step('pages.list', 'pages-row'),
        ...(used.length > 0
          ? [{ anchor: 'pages-row', ...BELOW, title: t('tours.pages.uses.title'), description: t('tours.pages.uses.description', { example: entryNavLabel(config, used[0].id) }) }]
          : [])
      ]
    } : null,
    pages.length > 0 ? {
      id: 'page-editor',
      title: t('tours.pageEditor.title'),
      path: paths.page(pages[0][0]),
      matches: depthUnder(`${paths.pages}/`, 1),
      steps: [
        step('pageEditor.outline', 'outline', RIGHT),
        step('pageEditor.form', 'section'),
        step('pageEditor.autosave', 'autosave'),
        step('pageEditor.missing', 'missing'),
        step('pageEditor.preview', 'preview', BELOW_END),
        step('pageEditor.history', 'history', BELOW_END),
        step('publish.after', 'publish', BELOW_END)
      ]
    } : null,
    singletons.length > 0 ? {
      id: 'site',
      title: t('tours.site.title'),
      path: paths.site(singletons[0][0]),
      matches: depthUnder(paths.site(''), 1),
      steps: [step('site.form', 'field'), step('site.autosave', 'autosave'), step('site.history', 'history', BELOW_END), step('publish.after', 'publish', BELOW_END)]
    } : null,
    collections.length > 0 ? {
      id: 'document',
      title: t('tours.document.title'),
      path: null,
      matches: depthUnder(paths.collection(''), 2),
      steps: [
        step('document.visibility', 'visibility'),
        {
          anchor: 'field',
          ...BELOW,
          title: t('tours.document.form.title'),
          description: [
            t('tours.document.form.description'),
            ...(hasSlug ? [t('tours.document.form.slug')] : []),
            ...(seoField ? [t('tours.document.form.seo', { label: resolveText(seoField.label, ctx) })] : [])
          ].join(' ')
        },
        step('document.autosave', 'autosave'),
        step('document.preview', 'preview', BELOW_END),
        step('document.history', 'history', BELOW_END)
      ]
    } : null,
    listed.length > 0 ? {
      id: 'collection',
      title: t('tours.collection.title'),
      path: paths.collection(listed[0][0]),
      matches: depthUnder(paths.collection(''), 1),
      steps: [
        step('collection.create', 'collection-new', BELOW_END),
        step('collection.list', 'collection-row'),
        ...(related
          ? [{
            title: t('tours.collection.related.title'),
            description: t('tours.collection.related.description', {
              field: resolveText(related.label, ctx),
              place: entryNavLabel(config, related.to)
            })
          }]
          : []),
        step('collection.publish', 'publish', BELOW_END)
      ]
    } : null,
    {
      id: 'media',
      title: t('tours.media.title'),
      path: items.media.href,
      matches: exactly(items.media.href),
      steps: [step('media.upload', 'media-upload'), step('media.alt'), step('media.toolbar', 'media-toolbar'), step('media.trash')]
    },
    {
      id: 'publish',
      title: t('tours.publish.title'),
      path: paths.publish,
      matches: exactly(paths.publish),
      steps: [step('publish.pending', 'publish-summary'), step('publish.button', 'publish-button', BELOW_END), step('publish.history', 'publish-log')]
    },
    {
      id: 'account',
      title: t('tours.account.title'),
      path: paths.account,
      matches: exactly(paths.account),
      steps: [
        {
          anchor: 'account-password',
          ...BELOW,
          title: t('tours.account.password.title'),
          description: t('tours.account.password.description', { option: t('account.signOutOthers') })
        },
        step('account.mfa', 'mfa')
      ]
    }
  ]

  return tours.filter(tour => tour !== null)
}

export const tourForPath = (tours: TourType[], pathname: string) => tours.find(tour => tour.matches(pathname)) ?? null

export const tourAnchor = (anchor: string) => `[data-tour="${anchor}"]`
