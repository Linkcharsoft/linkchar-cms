import type es from '../es/lists'
import type { CatalogType } from '../types'

const lists = {
  listColumns: {
    status: 'Status',
    edited: 'Last edited',
    actions: 'Actions',
    reorder: 'Reorder'
  },
  pagesList: {
    subtitle: 'Every page of the site with all its content: open one to edit its sections and how it shows up on Google.',
    page: 'Page',
    alsoShows: 'Also shows',
    viewOnSite: '(view on the site, opens in a new tab)',
    systemPage: 'System page',
    noContent: 'No content',
    useCount: '{label} ({count})',
    edit: 'Edit',
    editNamed: 'Edit {name}'
  },
  collectionList: {
    fallbackTitle: 'Collection',
    count: { one: '{count} item', other: '{count} items' },
    sections: '{name} sections',
    title: 'Title',
    searchPlaceholder: 'Search by title',
    sortBy: 'Sort by',
    filterStatus: 'Filter by status',
    allStatuses: 'All statuses',
    sorts: {
      manual: 'Manual order',
      updated: 'Recently edited',
      title: 'Title'
    },
    reorderFailed: 'The order could not be saved',
    createFailed: 'It could not be created',
    noResults: 'No results match those filters.',
    empty: 'There is no content yet.',
    emptyHelp: 'Create the first {name} with the button above.'
  },
  publishPanel: {
    title: 'Publish changes',
    subtitle: 'What you edit is saved as a draft. When you publish, the site is updated with all the changes together in about 5 minutes.',
    pending: 'Pending changes',
    allLive: 'Everything in the panel is already on the site.',
    ready: { one: '{count} change ready to publish', other: '{count} changes ready to publish' },
    summary: '{ready}.',
    summaryIncomplete: '{ready} · {incomplete}.',
    incomplete: { one: '{count} incomplete', other: '{count} incomplete' },
    publish: 'Publish changes',
    publishCount: 'Publish changes ({count})',
    cannotPublish: 'Your user can edit but not publish. An administrator can publish these changes or give you permission.',
    include: 'Include "{title}" in this publish',
    selectAll: 'Select all',
    selectNone: 'Clear selection',
    noneSelected: 'Tick at least one change to publish.',
    groups: {
      new: 'New on the site',
      changed: 'With changes',
      removed: 'Removed from the site'
    },
    sectionsChanged: 'Changed: ',
    urlChange: 'The URL changes from {from} to {to}. Old links will redirect to the new one.',
    problems: 'Not published until these are filled in: ',
    confirm: {
      publishes: 'To be published:',
      removes: 'To be removed from the site:',
      item: '{title} ({entry})',
      more: 'and {count} more',
      accept: 'Publish'
    },
    eta: 'The site updates in about 5 minutes.',
    failed: 'Nothing was published',
    done: 'Changes published',
    buildNotStarted: 'But we could not start the site update. Let support know.',
    history: 'Latest publications',
    historyEmpty: 'Nothing has been published yet.',
    published: { one: '{count} published', other: '{count} published' },
    removed: { one: '{count} removed', other: '{count} removed' },
    removedItem: 'Removed: {title}',
    errorReason: 'Reason: {reason}',
    errorDetail: 'Technical detail: {detail}',
    retry: 'Retry',
    retryOf: 'Retry',
    retrying: 'Retrying the site update',
    retryFailed: 'Could not retry'
  },
  trashList: {
    subtitle: 'Content stays here for {days} days and is then deleted automatically. Images and files have their own trash in {media}.',
    content: 'Content',
    trashedAt: 'Moved to the trash',
    offSite: 'Off the site',
    empty: 'The trash is empty.',
    restore: 'Restore',
    restoreFailed: 'It could not be restored',
    restored: 'Restored',
    restoredDetail: '"{title}" is back in {entry}.',
    purgeHeader: 'Delete permanently',
    purgeMessage: '"{title}" is deleted forever, along with its history. This cannot be undone.',
    purge: 'Delete',
    purgeNamed: 'Delete {title} permanently',
    purgeFailed: 'It could not be deleted',
    purged: 'Deleted permanently'
  }
} satisfies CatalogType<typeof es>

export default lists
