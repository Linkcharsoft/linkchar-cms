export const PREVIEW_DEVICES = {
  desktop: { icon: 'pi-desktop', width: 1280 },
  tablet: { icon: 'pi-tablet', width: 768 },
  mobile: { icon: 'pi-mobile', width: 390 }
} as const

export type PreviewDeviceType = keyof typeof PREVIEW_DEVICES

export const DRAFT_ROUTE = '/api/cms/draft'

export const draftUrl = (path: string) => `${DRAFT_ROUTE}?path=${encodeURIComponent(path)}`

const ORIGIN = 'http://preview.invalid'

// Draft Mode redirect target: only site pages on this origin, never the panel, the API or an open redirect.
export const safePreviewPath = (path: string | null, basePath: string): string | null => {
  if (!path || path.length > 300 || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null

  let url: URL
  try {
    url = new URL(path, ORIGIN)
  } catch {
    return null
  }

  if (url.origin !== ORIGIN) return null
  if ([basePath, '/api'].some(prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return null
  return `${url.pathname}${url.search}`
}
