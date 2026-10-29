import { MP4_HEAD_BYTES, readMp4Head } from '../../core/mp4'
import type { Mp4HeadType } from '../../core/mp4'

export type VideoProbeType = Mp4HeadType

// A browser that can't decode the file never fires loadedmetadata; the file's own header answers then.
const METADATA_TIMEOUT_MS = 5000

const metadataOf = (file: File) => new Promise<Pick<Mp4HeadType, 'width' | 'height' | 'duration'> | null>(resolve => {
  const video = document.createElement('video')
  const url = URL.createObjectURL(file)
  const done = (value: Pick<Mp4HeadType, 'width' | 'height' | 'duration'> | null) => {
    clearTimeout(timer)
    URL.revokeObjectURL(url)
    video.removeAttribute('src')
    resolve(value)
  }
  const timer = setTimeout(() => done(null), METADATA_TIMEOUT_MS)
  video.preload = 'metadata'
  video.onloadedmetadata = () => done({
    width: video.videoWidth || null,
    height: video.videoHeight || null,
    duration: Number.isFinite(video.duration) ? video.duration : null
  })
  video.onerror = () => done(null)
  video.src = url
})

// Size, duration and, for mp4, whether the file is faststart; webm always plays while it downloads.
export const probeVideo = async (file: File): Promise<VideoProbeType> => {
  const head = file.type === 'video/mp4'
    ? readMp4Head(new Uint8Array(await file.slice(0, MP4_HEAD_BYTES).arrayBuffer()))
    : { fastStart: true, duration: null, width: null, height: null }
  const played = await metadataOf(file)
  return {
    fastStart: head.fastStart,
    width: played?.width ?? head.width,
    height: played?.height ?? head.height,
    duration: played?.duration ?? head.duration
  }
}
