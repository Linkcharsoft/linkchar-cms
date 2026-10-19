import type { SiteImageType } from './types'

interface ImageOptionsType {
  // The `sizes` attribute for responsive images, e.g. "(min-width: 1024px) 50vw, 100vw".
  sizes?: string
}

// Props for next/image: size, alt text, the focal point as object-position and the blur placeholder when there is one.
export const imageProps = (image: SiteImageType, { sizes }: ImageOptionsType = {}) => ({
  src: image.src,
  alt: image.alt,
  width: image.width ?? undefined,
  height: image.height ?? undefined,
  ...(sizes ? { sizes } : {}),
  style: { objectPosition: `${image.focalX ?? 50}% ${image.focalY ?? 50}%` },
  ...(image.blurDataUrl ? { placeholder: 'blur' as const, blurDataURL: image.blurDataUrl } : {})
})
