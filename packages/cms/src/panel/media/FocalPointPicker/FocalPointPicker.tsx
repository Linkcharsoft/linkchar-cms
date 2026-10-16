'use client'
import './FocalPointPicker.sass'
import Image from 'next/image'
import { useT } from '../../client/context'
import type { KeyboardEvent, MouseEvent } from 'react'

interface Props {
  src: string
  width: number
  height: number
  x: number | null
  y: number | null
  onChange: (x: number, y: number) => void
}

const clamp = (value: number) => Math.min(1, Math.max(0, Math.round(value * 100) / 100))

const STEP = 0.05

const MOVES: Record<string, [number, number]> = {
  ArrowLeft: [-STEP, 0],
  ArrowRight: [STEP, 0],
  ArrowUp: [0, -STEP],
  ArrowDown: [0, STEP]
}

// The focal point is what crops (hero, cards) always keep visible. Arrow keys move it for keyboard users.
const FocalPointPicker = ({ src, width, height, x, y, onChange }: Props) => {
  const { t } = useT()
  const fx = x ?? 0.5
  const fy = y ?? 0.5

  const pick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    onChange(clamp((event.clientX - rect.left) / rect.width), clamp((event.clientY - rect.top) / rect.height))
  }

  const nudge = (event: KeyboardEvent<HTMLButtonElement>) => {
    const move = MOVES[event.key]
    if (!move) return
    event.preventDefault()
    onChange(clamp(fx + move[0]), clamp(fy + move[1]))
  }

  return (
    <button
      type='button'
      className='FocalPointPicker'
      aria-label={t('media.focalPoint', { x: Math.round(fx * 100), y: Math.round(fy * 100) })}
      onClick={pick}
      onKeyDown={nudge}
    >
      <Image src={src} alt='' width={width} height={height} sizes='(min-width: 768px) 480px, 90vw' className='FocalPointPicker__Image' />
      <span className='FocalPointPicker__Marker' style={{ left: `${fx * 100}%`, top: `${fy * 100}%` }} aria-hidden='true' />
    </button>
  )
}

export default FocalPointPicker
