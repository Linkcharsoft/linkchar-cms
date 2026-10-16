import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CustomButton from '../CustomButton'

afterEach(cleanup)

describe('CustomButton', () => {
  it('defaults to a medium primary button', () => {
    render(<CustomButton>Guardar</CustomButton>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button.className).toContain('CustomButton--Primary')
    expect(button.className).toContain('CustomButton--Md')
  })

  it('maps variant, size and icon-only to their modifiers', () => {
    render(<CustomButton variant='danger-ghost' size='sm' iconOnly icon='pi pi-trash' aria-label='Borrar' />)
    const button = screen.getByRole('button', { name: 'Borrar' })
    expect(button.className).toContain('CustomButton--DangerGhost')
    expect(button.className).toContain('CustomButton--Sm')
    expect(button.className).toContain('CustomButton--IconOnly')
  })

  it('renders a link that opens safely in a new tab', () => {
    render(<CustomButton href='/' target='_blank' variant='ghost'>Ver sitio</CustomButton>)
    const link = screen.getByRole('link', { name: 'Ver sitio' })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.className).toContain('CustomButton--Ghost')
  })

  it('blocks a disabled link', () => {
    render(<CustomButton href='/' disabled>Publicar</CustomButton>)
    const link = screen.getByRole('link', { name: 'Publicar' })
    expect(link.getAttribute('aria-disabled')).toBe('true')
    expect(link.className).toContain('CustomButton--Disabled')
  })
})
