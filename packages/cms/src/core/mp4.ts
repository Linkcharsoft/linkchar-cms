export interface Mp4HeadType {
  // moov before mdat: the browser plays while it downloads. null: neither box within the bytes read.
  fastStart: boolean | null
  duration: number | null
  width: number | null
  height: number | null
}

// How much of an mp4 the uploader reads: a faststart moov sits right after ftyp and fits here many times over.
export const MP4_HEAD_BYTES = 2 * 1024 * 1024

const EMPTY: Mp4HeadType = { fastStart: null, duration: null, width: null, height: null }

interface BoxType {
  type: string
  start: number
  end: number
  // Where the box's own content starts (after its header).
  body: number
}

const fourcc = (view: DataView, at: number) => String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3))

// The boxes between `from` and `to`; a box cut by `to` is reported with its declared end.
const boxes = (view: DataView, from: number, to: number): BoxType[] => {
  const found: BoxType[] = []
  let at = from
  while (at + 8 <= to) {
    let size = view.getUint32(at)
    const type = fourcc(view, at + 4)
    let body = at + 8
    if (size === 1) {
      if (at + 16 > to) break
      size = Number(view.getBigUint64(at + 8))
      body = at + 16
    } else if (size === 0) {
      size = to - at
    }
    if (size < 8) break
    found.push({ type, start: at, end: at + size, body })
    at += size
  }
  return found
}

const within = (view: DataView, box: BoxType) => boxes(view, box.body, Math.min(box.end, view.byteLength))

const find = (view: DataView, parent: BoxType, type: string) => within(view, parent).find(box => box.type === type)

const complete = (view: DataView, box: BoxType | undefined) => (box && box.end <= view.byteLength ? box : undefined)

// mvhd: version 0 stores timescale and duration as 32 bits at 12 and 16, version 1 at 20 and 24 (64 bits).
const durationOf = (view: DataView, mvhd: BoxType) => {
  const version = view.getUint8(mvhd.body)
  const timescale = version === 1 ? view.getUint32(mvhd.body + 20) : view.getUint32(mvhd.body + 12)
  const duration = version === 1 ? Number(view.getBigUint64(mvhd.body + 24)) : view.getUint32(mvhd.body + 16)
  return timescale > 0 ? duration / timescale : null
}

// tkhd keeps the presentation size as 16.16 fixed point in its last 8 bytes; the video track is the one with a size.
const sizeOf = (view: DataView, moov: BoxType) => {
  for (const trak of within(view, moov).filter(box => box.type === 'trak')) {
    const tkhd = complete(view, find(view, trak, 'tkhd'))
    if (!tkhd) continue
    const width = Math.round(view.getUint32(tkhd.end - 8) / 65536)
    const height = Math.round(view.getUint32(tkhd.end - 4) / 65536)
    if (width > 0 && height > 0) return { width, height }
  }
  return { width: null, height: null }
}

// What the first bytes of an mp4 say: whether it is faststart, and its duration and size when the moov is in reach.
export const readMp4Head = (bytes: Uint8Array): Mp4HeadType => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const top = boxes(view, 0, view.byteLength)
  if (top.length === 0 || top[0].type !== 'ftyp') return EMPTY

  const moovAt = top.findIndex(box => box.type === 'moov')
  const mdatAt = top.findIndex(box => box.type === 'mdat')
  const fastStart = moovAt === -1 && mdatAt === -1 ? null : moovAt !== -1 && (mdatAt === -1 || moovAt < mdatAt)
  const moov = complete(view, top[moovAt])
  if (!moov) return { ...EMPTY, fastStart }

  const mvhd = complete(view, find(view, moov, 'mvhd'))
  return { fastStart, duration: mvhd ? durationOf(view, mvhd) : null, ...sizeOf(view, moov) }
}
