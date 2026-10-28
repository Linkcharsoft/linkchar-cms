import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import FocalPointPicker from '../FocalPointPicker/FocalPointPicker'

afterEach(cleanup)

describe('FocalPointPicker', () => {
  it('sizes its box like the image, so a click maps to the picture', () => {
    const onChange = vi.fn()
    renderPanel(<FocalPointPicker src='http://127.0.0.1:54421/v.webp' width={500} height={1100} x={null} y={null} onChange={onChange} />)
    const button = screen.getByRole('button')
    expect(button.style.aspectRatio).toBe('500 / 1100')
    // jsdom folds the calc() into pixels; a browser keeps it as written.
    expect(button.style.width).toMatch(/^min\(100%, (calc\(420px \* 500 \/ 1100\)|190\.9\d*px)\)$/)

    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50, width: 200, height: 440 } as DOMRect)
    fireEvent.click(button, { clientX: 150, clientY: 270 })
    expect(onChange).toHaveBeenCalledWith(0.25, 0.5)
  })
})
