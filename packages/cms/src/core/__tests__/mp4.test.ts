import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readMp4Head } from '../mp4'

const fixture = (name: string) => new Uint8Array(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))))

const ascii = (text: string) => [...text].map(char => char.charCodeAt(0))

const u32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]

const box = (type: string, ...content: number[][]): number[] => {
  const body = content.flat()
  return [...u32(8 + body.length), ...ascii(type), ...body]
}

const mvhd = (timescale: number, duration: number) => box('mvhd', [0, 0, 0, 0], u32(0), u32(0), u32(timescale), u32(duration))

// tkhd version 0: 76 bytes of fields before the 16.16 width and height.
const tkhd = (width: number, height: number) => box('tkhd', Array(76).fill(0), u32(width * 65536), u32(height * 65536))

const bytes = (...parts: number[][]) => new Uint8Array(parts.flat())

const ftyp = box('ftyp', ascii('isom'), u32(512), ascii('isomiso2mp41'))

describe('readMp4Head', () => {
  it('reads a faststart file: moov first, with its duration and size', () => {
    const head = readMp4Head(bytes(ftyp, box('moov', mvhd(1000, 12500), box('trak', tkhd(0, 0)), box('trak', tkhd(1280, 720))), box('mdat', [1, 2, 3])))
    expect(head).toEqual({ fastStart: true, duration: 12.5, width: 1280, height: 720 })
  })

  it('reads a 64-bit mvhd', () => {
    const long = box('mvhd', [1, 0, 0, 0], u32(0), u32(0), u32(0), u32(0), u32(90000), u32(0), u32(180000))
    expect(readMp4Head(bytes(ftyp, box('moov', long), box('mdat')))).toMatchObject({ fastStart: true, duration: 2 })
  })

  it('tells a file whose mdat comes first, even when the moov is past the bytes read', () => {
    const slow = bytes(ftyp, box('free'), [...u32(5_000_000), ...ascii('mdat'), 0, 0, 0, 0])
    expect(readMp4Head(slow)).toEqual({ fastStart: false, duration: null, width: null, height: null })
  })

  it('answers null for faststart while neither box is within the bytes read', () => {
    expect(readMp4Head(bytes(ftyp, [...u32(5_000_000), ...ascii('free'), 0, 0]))).toEqual({ fastStart: null, duration: null, width: null, height: null })
  })

  it('answers nothing for bytes that are not an mp4', () => {
    expect(readMp4Head(new Uint8Array([1, 2, 3]))).toEqual({ fastStart: null, duration: null, width: null, height: null })
    expect(readMp4Head(bytes(box('moov')))).toEqual({ fastStart: null, duration: null, width: null, height: null })
  })

  it('reads what ffmpeg writes with and without -movflags +faststart', () => {
    expect(readMp4Head(fixture('clip.mp4'))).toEqual({ fastStart: true, duration: 1, width: 64, height: 64 })
    expect(readMp4Head(fixture('slow.mp4'))).toMatchObject({ fastStart: false })
  })
})
