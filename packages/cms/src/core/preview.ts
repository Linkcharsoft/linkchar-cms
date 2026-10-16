// "/blog/:slug" + "mi-post" → "/blog/mi-post"; null while a needed slug is still empty.
export const resolveEntryPath = (pattern: string | undefined, slug?: unknown): string | null => {
  if (!pattern) return null
  if (!pattern.includes(':slug')) return pattern
  return typeof slug === 'string' && slug.trim() ? pattern.replace(':slug', encodeURIComponent(slug.trim())) : null
}

// "/blog/:slug" → "/blog/": where a collection's documents live, for redirects when the slug changes.
export const slugPrefix = (pattern: string | undefined): string | null =>
  pattern?.endsWith(':slug') ? pattern.slice(0, -':slug'.length) : null
