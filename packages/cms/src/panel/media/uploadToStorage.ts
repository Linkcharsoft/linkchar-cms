import { MEDIA_BUCKET } from '../../core/media'

export type UploadErrorReasonType = 'tooLarge' | 'failed' | 'network'

export class UploadError extends Error {
  constructor (readonly reason: UploadErrorReasonType) {
    super(`Media upload failed: ${reason}`)
  }
}

interface Options {
  supabase: { url: string, publishableKey: string }
  path: string
  blob: Blob
  accessToken: string
  onProgress?: (ratio: number) => void
}

// Plain XHR: supabase-js uploads don't report progress. Storage RLS still checks the user's role via the token.
const uploadToStorage = ({ supabase, path, blob, accessToken, onProgress }: Options) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabase.url.replace(/\/$/, '')}/storage/v1/object/${MEDIA_BUCKET}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', supabase.publishableKey)
    xhr.setRequestHeader('Content-Type', blob.type)
    xhr.setRequestHeader('x-upsert', 'false')
    // Paths are unique and never overwritten, so the file can be cached for a year.
    xhr.setRequestHeader('cache-control', 'max-age=31536000')

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new UploadError(xhr.status === 413 ? 'tooLarge' : 'failed'))
    }
    xhr.onerror = () => reject(new UploadError('network'))
    xhr.send(blob)
  })

export default uploadToStorage
