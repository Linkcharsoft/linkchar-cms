import type es from '../es/media'
import type { CatalogType } from '../types'

const media = {
  media: {
    subtitle: 'Images and PDFs that can be used anywhere on the site.',
    untitled: 'Untitled',
    texts: {
      alt: 'Alt text',
      altIn: 'Alt text ({language})',
      altHelp: 'Describe the image for people who can\'t see it (screen readers) and for Google. Required.',
      altPlaceholder: 'E.g.: Team gathered around a table',
      description: 'Description',
      descriptionIn: 'Description ({language})',
      caption: 'Caption (optional)',
      captionIn: 'Caption ({language}, optional)',
      folder: 'Folder'
    },
    library: {
      trash: 'Trash',
      backToLibrary: 'Back to the library',
      upload: 'Upload',
      searchPlaceholder: 'Search by name or description',
      allFolders: 'All folders',
      fileType: 'File type',
      types: {
        any: 'Images and PDF',
        image: 'Images',
        document: 'PDF'
      },
      trashNote: 'Files in the trash are deleted automatically after 30 days.',
      trashEmpty: 'The trash is empty.',
      noMatches: 'No files match.',
      loadMore: 'Load more',
      selected: { one: '{count} selected', other: '{count} selected' },
      pickOne: 'Choose a file',
      useSelection: 'Use selection',
      useFile: 'Use file'
    },
    uploader: {
      dropHere: 'Drag files here or',
      choose: 'Choose files',
      hint: 'Images or PDF, up to {max} MB. Photos are optimized automatically.',
      inputLabel: 'Choose files to upload',
      remove: 'Remove {name}',
      missingAlt: 'To upload, fill in the alt text of every image.',
      submit: { one: 'Upload file', other: 'Upload {count} files' },
      rejected: '{name}: {reason}',
      errors: {
        invalidType: 'Format not allowed. Use JPG, PNG, WebP, AVIF, GIF or PDF.',
        onlyImages: 'Only images can be uploaded here.',
        onlyDocuments: 'Only PDFs can be uploaded here.',
        tooLarge: 'The file is larger than {max} MB.',
        tooLargeCompressed: 'The file is larger than {max} MB even when compressed.',
        unreadable: 'We couldn\'t read the image. Try exporting it as JPG or PNG.',
        sessionExpired: 'Your session expired. Sign in again.',
        failed: 'The file couldn\'t be uploaded.',
        network: 'The file couldn\'t be uploaded. Check your connection.',
        storageTooLarge: 'The file is larger than the maximum allowed.'
      }
    },
    details: {
      fallbackTitle: 'File',
      save: 'Save',
      saved: 'Changes saved',
      restore: 'Restore',
      restored: 'File restored',
      trashed: 'Moved to the trash',
      purge: 'Delete forever',
      purgeHeader: 'Delete permanently',
      purgeMessage: 'The file is deleted forever and can\'t be recovered.',
      inUse: 'The file is in use',
      actionFailed: 'The action couldn\'t be completed',
      purgeFailed: 'The file couldn\'t be deleted',
      openPdf: 'Open PDF',
      dimensions: '{width}×{height}px',
      uploadedOn: 'uploaded on {date}',
      focalHelp: 'Click the image to mark the spot that must always stay visible.',
      usageTitle: 'Where it\'s used',
      unused: 'It isn\'t used in any content.',
      usageTrashed: 'in the trash',
      usageOnlyPublished: 'in the published version, it goes away with the next publish',
      blockedPurge: 'It can\'t be deleted forever while it\'s in use: replace it in these places first.',
      blockedTrash: 'It can\'t be moved to the trash while it\'s in use: replace it in these places first.',
      url: 'File address',
      copyUrl: 'Copy address',
      copied: 'Address copied'
    },
    focalPoint: 'Focal point: {x}% horizontal, {y}% vertical. Click or use the arrow keys to move it.'
  },
  mediaInput: {
    image: {
      choose: 'Choose image',
      chooseFor: 'Choose image for {label}',
      changeOf: 'Change image of {label}'
    },
    file: {
      choose: 'Choose PDF',
      chooseFor: 'Choose PDF for {label}',
      changeOf: 'Change PDF of {label}'
    },
    change: 'Change',
    edit: 'Edit',
    editAltAndFocal: 'Alt text and focal point',
    remove: 'Remove',
    altText: 'Alt text: {alt}',
    trashed: 'It\'s in the trash: restore it from {media} or choose another one.',
    missing: 'The chosen file no longer exists. Choose another one.'
  },
  gallery: {
    add: 'Add images',
    removed: 'Deleted image'
  }
} satisfies CatalogType<typeof es>

export default media
