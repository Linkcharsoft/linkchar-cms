import type es from '../es/core'
import type { CatalogType } from '../types'

const core = {
  common: {
    yes: 'Yes',
    no: 'No',
    empty: '—',
    changed: 'Changed'
  },
  validation: {
    required: 'This field is required',
    invalid: 'Invalid value',
    maxLength: 'Use up to {max} characters',
    pattern: 'Invalid format',
    email: 'Enter a valid email',
    url: 'Enter a URL starting with https://',
    phone: 'Enter a valid phone number',
    slug: 'Use lowercase letters, numbers and dashes',
    video: 'Paste a YouTube or Vimeo link',
    richText: 'Invalid content',
    number: 'Enter a number',
    min: 'The minimum is {min}',
    max: 'The maximum is {max}',
    date: 'Invalid date',
    option: 'Choose a valid option',
    color: 'Use a color like #1f5fa8',
    maxOptions: 'Choose up to {max}',
    minOptions: 'Choose at least {min}',
    linkEntry: 'Choose a page or an item of the site',
    linkType: 'Invalid link type',
    linkInternal: 'Internal links start with /',
    linkExternal: 'Enter a URL starting with https://',
    linkEmail: 'Enter a valid email',
    linkTel: 'Enter a valid phone number',
    linkAnchor: 'Anchors start with #',
    variant: 'Invalid variant',
    time: 'Use the HH:MM format',
    timeOrder: 'Closing time must be after opening time',
    file: 'Invalid file',
    maxImages: 'You can choose up to {max} images',
    minImages: 'Choose at least {min} images',
    reference: 'Invalid reference',
    maxItems: 'You can add up to {max}',
    minItems: 'Add at least {min}',
    blockType: 'Unknown block type',
    maxBlocks: 'You can add up to {max} blocks',
    minBlocks: { one: 'Add at least {count} block', other: 'Add at least {count} blocks' },
    translationMissing: 'Missing in {language}',
    altOf: 'Alt text of {field}',
    altMissing: 'Missing alt text in {language}',
    slugTaken: 'Another item already uses this URL'
  },
  errors: {
    invalidData: 'Check the data you entered.',
    forbidden: 'You are not allowed to do this.',
    unknownEntry: 'Unknown content.',
    documents: {
      saveFailed: 'We could not save. Check your connection.',
      gone: 'This content no longer exists. Reload the page.',
      busy: 'There are many changes at once. Wait a few seconds and try again.',
      createFailed: 'We could not create the content. Try again.',
      updateFailed: 'We could not save the change. Try again.'
    },
    versions: {
      gone: 'That version no longer exists.',
      notPublished: 'This content has not been published yet.',
      slugTaken: 'Another item already uses the URL of that version. Change it first.',
      failed: 'We could not restore. Try again.'
    },
    trash: {
      slugTaken: 'Another item already uses its URL. Change that one first.',
      restoreFailed: 'It could not be restored.',
      notTrashed: 'It is not in the trash.',
      stillPublished: 'It is still published: publish the changes to remove it from the site, then delete it.',
      purgeFailed: 'It could not be deleted.'
    },
    publish: {
      stale: 'Something changed while you were reviewing. Refresh the list and publish again.',
      nothing: 'There are no changes to publish.',
      forbidden: 'You are not allowed to publish. Ask an administrator.',
      slugTaken: 'Two items would end up with the same URL. Change one of them and publish again.',
      invalidSlug: 'One of the new URLs is not valid. Check it and publish again.',
      failed: 'We could not publish. Try again.'
    },
    build: {
      target_missing: 'How the site gets updated is not configured yet.',
      hook_refused: 'The service that updates the site refused the request.',
      hook_unreachable: 'We could not start updating the site.',
      build_failed: 'Updating the site failed.',
      build_cancelled: 'Updating the site was cancelled before it finished.'
    },
    media: {
      altRequired: 'Images need an alternative text.',
      invalidFolder: 'Invalid folder.',
      invalidType: 'File type not allowed.',
      tooLarge: 'The file is larger than {max} MB.',
      invalidDimensions: 'Invalid dimensions.',
      invalidPreview: 'Invalid preview.',
      invalidFocalPoint: 'Invalid focal point.',
      registerFailed: 'The file could not be saved in the library.',
      gone: 'The file no longer exists.',
      updateFailed: 'The changes could not be saved.'
    },
    users: {
      forbidden: 'You are not allowed to manage this user.',
      emailTaken: 'A user with that email already exists.',
      emailRateLimit: 'The hourly email limit was reached. Try again later.',
      inviteFailed: 'We could not send the invitation. Try again.',
      saveFailed: 'We could not save the changes.',
      alreadySignedIn: 'This user already signed in: they can use "Forgot my password".',
      deleteSignedIn: 'This user already signed in: deactivate them instead of deleting them.',
      deleteInviteFailed: 'We could not delete the invitation.',
      mfaResetFailed: 'We could not reset the two-step verification.'
    },
    account: {
      nameFailed: 'We could not save your name. Try again.',
      invalidPhoto: 'The photo is not valid.',
      photoFailed: 'We could not save the photo. Try again.',
      wrongPassword: 'The current password is not correct.',
      weakPassword: 'The password is too weak: use at least 10 characters with letters and numbers.',
      samePassword: 'The new password must be different from the previous one.',
      passwordFailed: 'We could not save the password. Try again.',
      toursFailed: 'We could not restart the guides.'
    },
    auth: {
      rateLimit: 'Too many attempts. Wait a few minutes.',
      inactive: 'Your user is deactivated. Contact an administrator.',
      wrongCredentials: 'Wrong email or password.',
      linkRequired: 'This step only works from the link you got by email. Ask for a new one.',
      nameFailed: 'We saved your password, but not your name. You can change it later.'
    }
  },
  forms: {
    emailRequired: 'Enter the email',
    emailInvalid: 'Enter a valid email',
    passwordRequired: 'Enter your password',
    currentPasswordRequired: 'Enter your current password',
    newPasswordRequired: 'Enter a password',
    passwordLength: 'Use at least {min} characters',
    passwordLetter: 'Include at least one letter',
    passwordDigit: 'Include at least one number',
    confirmRequired: 'Repeat the password',
    confirmMismatch: 'The passwords do not match',
    nameRequired: 'Enter the name',
    nameLength: 'Use up to {max} characters',
    roleRequired: 'Choose a role',
    codeRequired: 'Enter the code',
    codeFormat: 'The code has 6 digits',
    deviceRequired: 'Choose a phone'
  },
  diff: {
    otherFile: 'Another file',
    images: { one: '{count} image', other: '{count} images' },
    deleted: 'Deleted content',
    openingHours: 'Opening hours'
  },
  relations: {
    trashedTag: 'In the trash',
    trashed: 'is in the trash',
    hiddenTag: 'Hidden',
    hidden: 'is hidden',
    unpublishingTag: 'Removed on publish',
    unpublishing: 'is removed from the site on publish',
    newTag: 'Unpublished',
    new: 'is not published yet: it goes out with the next publish',
    missing: '{name} {reason}: it will not appear on the site.',
    notice: '{name} {reason}.',
    deleted: 'A chosen item no longer exists: it will not appear on the site.',
    incomplete: '{name} is not published until its fields are complete: it will not appear on the site.',
    notSelected: '{name} is not ticked to publish: it will not be on the site.',
    usedLive: '{name} uses it and stays on the site: it will be left without this item.'
  },
  collection: {
    new: 'New {name}',
    untitled: 'Untitled {name}',
    copy: '{title} (copy)',
    copySlug: 'copy'
  },
  section: {
    hide: 'Hide this section'
  },
  seo: {
    label: 'How it looks on Google and when shared',
    help: 'How this page looks on Google and when the link is shared.',
    title: 'Title for Google',
    titleHelp: 'Ideally up to 60 characters.',
    titleHelpFallback: 'Ideally up to 60 characters. If left empty, the title is used.',
    description: 'Description for Google',
    descriptionHelpFallback: 'If left empty, the summary is used.',
    image: 'Image when shared',
    imageHelp: 'Shown when the link is shared on WhatsApp or social media. Ideally 1200 × 630 px.'
  }
} satisfies CatalogType<typeof es>

export default core
