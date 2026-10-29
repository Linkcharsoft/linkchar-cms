import { getImageProps } from 'next/image'
import type { SiteVideoType } from './types'
import type { ReactNode, VideoHTMLAttributes } from 'react'

export interface VideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'poster' | 'autoPlay' | 'width' | 'height'> {
  video: SiteVideoType
  // Plays on its own, muted and looping (browsers allow nothing else); off by default to spare the visitor's data.
  autoplay?: boolean
  // <track> elements for captions, and a fallback for browsers that can't play the file.
  children?: ReactNode
}

// The poster goes through the image optimizer like every other image, so it costs no Storage egress.
const posterSrc = (poster: SiteVideoType['poster']) => {
  if (!poster) return undefined
  if (!poster.width || !poster.height) return poster.src
  return getImageProps({ src: poster.src, alt: '', width: poster.width, height: poster.height, sizes: '100vw' }).props.src
}

// <video> for a Media file: metadata only until the visitor plays it, never autoplay with sound.
const Video = ({ video, autoplay = false, controls = !autoplay, children, ...rest }: VideoProps) => (
  // eslint-disable-next-line jsx-a11y/media-has-caption -- the project passes its <track> as children
  <video
    controls={controls}
    preload='metadata'
    playsInline
    width={video.width ?? undefined}
    height={video.height ?? undefined}
    poster={posterSrc(video.poster)}
    {...(autoplay ? { autoPlay: true, muted: true, loop: true } : {})}
    {...rest}
  >
    <source src={video.src} type={video.mime} />
    {children}
  </video>
)

export default Video
