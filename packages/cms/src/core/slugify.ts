const MAX_SLUG_LENGTH = 80

const toAscii = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Lenient version for the input while typing: keeps a trailing dash so words can be separated.
export const typingSlug = (value: string): string =>
  toAscii(value).replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').slice(0, MAX_SLUG_LENGTH)

const slugify = (value: string): string =>
  toAscii(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')

export default slugify
