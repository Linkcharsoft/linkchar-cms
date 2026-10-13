export interface ParsedVideoType {
  provider: 'youtube' | 'vimeo'
  id: string
}

// Extracts provider + video id from the URL an editor pastes in the CMS.
// Supports youtube.com/watch?v=, youtu.be/, /shorts/, /embed/, /live/ and vimeo.com/{id}.
// Returns null for anything else so the blog never renders an arbitrary iframe.
const parseVideoUrl = (raw: string): ParsedVideoType | null => {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  const host = url.hostname.replace(/^(www\.|m\.)/, '')
  const segments = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    const id = segments[0]
    return id && /^[\w-]{11}$/.test(id) ? { provider: 'youtube', id } : null
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = segments[0] === 'watch'
      ? url.searchParams.get('v')
      : ['shorts', 'embed', 'live'].includes(segments[0]) ? segments[1] : null
    return id && /^[\w-]{11}$/.test(id) ? { provider: 'youtube', id } : null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = segments.find(segment => /^\d+$/.test(segment))
    return id ? { provider: 'vimeo', id } : null
  }

  return null
}

export default parseVideoUrl
