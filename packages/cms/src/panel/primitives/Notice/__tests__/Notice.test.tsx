import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Notice from '../Notice'

afterEach(cleanup)

describe('Notice', () => {
  it('announces errors as alerts', () => {
    render(<Notice tone='error'>No se pudo guardar</Notice>)
    expect(screen.getByRole('alert').textContent).toContain('No se pudo guardar')
  })

  it('keeps info notices out of the live regions', () => {
    render(<Notice>Dato útil</Notice>)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('lets the caller pick the role and hide the icon', () => {
    const { container } = render(<Notice tone='success' role='status' icon={null}>Listo</Notice>)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(container.querySelector('.Notice__Icon')).toBeNull()
  })
})
