import { fitWithin } from './processImage'
import type { ProcessedFileType } from './processImage'

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('The frame could not be encoded'))), type, quality)
  })

const draw = (video: HTMLVideoElement, width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(video, 0, 0, width, height)
  return canvas
}

// The frame on screen as a WebP image with its blur preview, the way the uploader processes a photo.
export const capturePoster = async (video: HTMLVideoElement): Promise<ProcessedFileType> => {
  const size = fitWithin(video.videoWidth, video.videoHeight)
  if (!size.width || !size.height) throw new Error('The video has no frame to capture')
  const blurSize = fitWithin(video.videoWidth, video.videoHeight, 16)
  const blurDataUrl = draw(video, blurSize.width, blurSize.height).toDataURL('image/webp', 0.5)
  const blob = await toBlob(draw(video, size.width, size.height), 'image/webp', 0.85)
  return { blob, mime: blob.type, ...size, blurDataUrl }
}
