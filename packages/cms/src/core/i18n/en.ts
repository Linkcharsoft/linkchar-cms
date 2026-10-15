import type { MessagesType } from './types'

const en = {
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
    maxOptions: 'Choose up to {max}',
    minOptions: 'Choose at least {min}',
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
    altMissing: 'Missing alt text in {language}'
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
    incomplete: '{name} is not published until its fields are complete: it will not appear on the site.'
  },
  collection: {
    new: 'New {name}',
    untitled: 'Untitled {name}'
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
} satisfies MessagesType

export default en
