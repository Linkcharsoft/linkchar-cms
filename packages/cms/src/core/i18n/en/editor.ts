import type es from '../es/editor'
import type { CatalogType } from '../types'

const editor = {
  editor: {
    preview: 'Preview',
    previewNeedsUrl: 'Fill in the URL to see the preview',
    reviewAndPublish: 'Review and publish',
    missing: 'To publish, fill in:',
    missingMore: ' and {count} more',
    resolveFirst: 'First resolve the unsaved changes',
    someoneSaved: 'Someone else saved changes',
    reloadAndRetry: 'Reload the page and try again.',
    couldNotFinish: 'It could not be completed',
    language: 'Language',
    languageHelp: 'Texts are entered per language; images, links and options are the same in all of them.',
    discardSection: {
      header: 'Back to the published version: {label}',
      message: '{label} goes back to what is published. The rest of the page does not change and what is there now stays in the history.',
      accept: 'Discard changes',
      done: '{label}: changes discarded'
    },
    autosave: {
      idle: 'No changes',
      pending: 'Unsaved changes',
      saving: 'Saving…',
      saved: 'Saved',
      savedAt: 'Saved at {time}',
      partial: 'Saved, except the URL: another item already uses it',
      invalid: 'Some fields need fixing',
      conflict: 'Someone else saved changes',
      error: 'Saving failed, retrying when you edit'
    },
    conflict: {
      header: 'Someone else saved changes',
      loadCurrent: 'Load the current version',
      text: 'While you were editing, someone else saved changes{parts}{time}. Not to overwrite their work, your latest changes were not applied.',
      parts: ' in {parts}',
      time: ' ({time})',
      kept: 'Your version was saved in the content history, so nothing is lost.'
    },
    document: {
      thisContent: 'This content',
      visibilityFailed: 'The visibility could not be changed',
      willShow: 'It will be shown on the site',
      willHide: 'It will be hidden from the site',
      nextPublish: 'The change applies with the next publish.',
      trashHeader: 'Move to the trash',
      trashMessage: '{name} goes to the trash. You can restore it from there for 30 days. If it is published, it leaves the site with the next publish.',
      usedBy: 'These items use it and will be left without it when you publish:',
      trashFailed: 'It could not be moved to the trash',
      trashed: 'Moved to the trash',
      duplicate: 'Duplicate',
      duplicateNamed: 'Duplicate {name}',
      trash: 'Trash',
      trashNamed: 'Move {name} to the trash',
      showOnSite: 'Show on the site'
    },
    page: {
      backToPublished: 'Back to published',
      outline: 'Page sections',
      outlineTitle: 'On this page',
      goTo: 'Go to a section',
      goToLabel: 'Go to a section of the page',
      missing: 'Incomplete',
      changed: 'Changed',
      changedUnpublished: 'With unpublished changes',
      hidden: 'Hidden',
      hiddenOnSite: 'Hidden on the site',
      marksMissing: 'incomplete',
      marksChanged: 'changed',
      marksHidden: 'hidden',
      hiddenNotice: 'This section is not shown on the site. Turn on "Show on the site" to show it again.',
      usesBefore: 'It also shows content from ',
      usesAfter: ', edited separately.',
      and: ' and '
    },
    previewPane: {
      size: 'Screen size',
      open: 'Open in a new tab',
      frame: 'Preview of the site with the unpublished changes',
      devices: { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Phone' }
    },
    seoPreview: {
      group: 'Google preview',
      label: 'This is how it would look on Google',
      titleMissing: 'The title is missing',
      descriptionMissing: 'Google will pick a text from the page.',
      fallback: 'What you leave empty is filled in from the page content.'
    },
    history: {
      open: 'History',
      now: 'Now',
      version: 'Version',
      reasons: {
        publish: 'Published version',
        restore: 'Draft before restoring',
        discard: 'Draft before discarding changes',
        conflict: 'Version not saved because of a conflict',
        checkpoint: 'Automatic save'
      },
      thePage: 'The page',
      theDraft: 'The draft',
      restorePageHeader: 'Restore the whole page',
      restoreHeader: 'Restore version',
      restoreMessage: '{scope} goes back to the version of {date}. What is there now stays in the history.',
      restore: 'Restore',
      restoreAll: 'Restore all',
      restored: 'Version restored in the draft',
      restoreSectionHeader: 'Restore {label}',
      restoreSectionMessage: '{label} goes back to the version of {date}. The rest of the page does not change and what is there now stays in the history.',
      restoreSection: 'Restore section',
      sectionRestored: '{label}: version restored in the draft',
      discardHeader: 'Discard changes',
      discardMessage: '{scope} goes back to what is published. What is there now stays in the history.',
      discard: 'Discard changes',
      discarded: 'Changes discarded',
      unpublished: 'There are unpublished changes.',
      empty: 'There are no versions yet.',
      emptyHelp: 'One is saved when publishing and another every 15 minutes while you edit.',
      showChanges: 'See changes',
      same: 'It is the same as the current draft.'
    }
  },
  fields: {
    chooseOne: 'Choose an option',
    chooseMany: 'Choose one or more options',
    regenerateSlug: 'Generate again',
    issues: { one: '{count} field to review', other: '{count} fields to review' },
    placeholders: {
      url: 'https://',
      video: 'https://www.youtube.com/watch?v=…',
      phone: '+1 555 …'
    },
    button: {
      text: 'Button text',
      style: 'Style',
      target: 'Target'
    },
    link: {
      kinds: {
        entry: 'Site page',
        internal: 'Other address',
        external: 'External site',
        email: 'Email',
        tel: 'Phone',
        anchor: 'Section of this page'
      },
      placeholders: {
        internal: '/contact',
        external: 'https://',
        email: 'hello@yoursite.com',
        tel: '+1 555 …',
        anchor: '#contact'
      },
      typeOf: 'Link type of {label}',
      targetOf: 'Target of {label}',
      documentOf: 'Item of {label}',
      sectionOf: 'Section of {label}',
      pickEntry: 'Choose a page or an item',
      wholePage: 'Whole page',
      newTab: 'Open in a new tab'
    },
    list: {
      add: 'Add',
      count: '{count} of {max}',
      item: '{label} {number}',
      removeHeader: 'Delete item',
      removeMessage: 'Delete "{title}"?',
      remove: 'Delete'
    },
    blocks: {
      add: 'Add block',
      removeHeader: 'Delete block',
      removeMessage: 'Delete the block "{title}"?',
      empty: 'No content yet',
      fallback: 'Block'
    },
    sortable: {
      move: 'Move {title}',
      duplicate: 'Duplicate {title}',
      remove: 'Delete {title}',
      dragStart: 'Moving {label}, position {position} of {total}.',
      dragOver: '{label} moves to position {position}.',
      dragEnd: '{label} is now at position {position}.',
      dragCancel: 'Moving {label} was cancelled.',
      instructions: 'To move, press space or enter. Use the arrows to change the position and space or enter to drop. Escape cancels.'
    }
  }
} satisfies CatalogType<typeof es>

export default editor
