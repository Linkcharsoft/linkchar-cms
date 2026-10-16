import { isImageMime, MAX_IMAGE_DIMENSION } from '../../core/media'

export interface ProcessedFileType {
  blob: Blob
  mime: string
  width: number | null
  height: number | null
  blurDataUrl: string | null
}

export const fitWithin = (width: number, height: number, max = MAX_IMAGE_DIMENSION) => {
  if (width <= max && height <= max) return { width, height }
  const scale = max / Math.max(width, height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

const draw = (bitmap: ImageBitmap, width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
  return canvas
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('The image could not be encoded'))), type, quality)
  })

// Re-encoding through a canvas drops EXIF (GPS included); `from-image` keeps phone photos upright.
const processImage = async (file: File, maxDimension = MAX_IMAGE_DIMENSION): Promise<ProcessedFileType> => {
  if (!isImageMime(file.type)) return { blob: file, mime: file.type, width: null, height: null, blurDataUrl: null }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  try {
    const blurSize = fitWithin(bitmap.width, bitmap.height, 16)
    const blurDataUrl = draw(bitmap, blurSize.width, blurSize.height).toDataURL('image/webp', 0.5)

    // Animated GIFs would lose their frames on a canvas.
    if (file.type === 'image/gif') {
      return { blob: file, mime: file.type, width: bitmap.width, height: bitmap.height, blurDataUrl }
    }

    const size = fitWithin(bitmap.width, bitmap.height, maxDimension)
    const canvas = draw(bitmap, size.width, size.height)
    let blob = await toBlob(canvas, 'image/webp', 0.85)

    // Browsers without WebP encoding return PNG: JPEG keeps opaque photos small.
    if (blob.type !== 'image/webp' && file.type !== 'image/png') blob = await toBlob(canvas, 'image/jpeg', 0.85)

    return { blob, mime: blob.type, ...size, blurDataUrl }
  } finally {
    bitmap.close()
  }
}

export default processImage
