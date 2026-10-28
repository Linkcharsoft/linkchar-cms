import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useFormikContext } from 'formik'
import { afterEach, describe, expect, it } from 'vitest'
import { color } from '../../../../core/fields'
import { renderField } from '../../../__tests__/render'
import ColorInput from '../ColorInput'

afterEach(cleanup)

const Values = () => <output data-testid='values'>{JSON.stringify(useFormikContext().values)}</output>
const stored = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}')

describe('ColorInput', () => {
  const brand = color({ label: 'Color de marca', presets: ['#1f5fa8', '#D92D20'] })

  it('shows the hex, the native picker and the presets', () => {
    renderField(<ColorInput name='brand' field={brand} />, { values: { brand: '#1f5fa8' } })
    expect(screen.getByLabelText('Color de marca')).toHaveProperty('value', '#1f5fa8')
    expect(screen.getByLabelText('Elegir Color de marca con el selector')).toHaveProperty('value', '#1f5fa8')
    const presets = screen.getByRole('group', { name: 'Colores sugeridos para Color de marca' })
    expect(presets.querySelectorAll('button')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Usar #1f5fa8' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Usar #D92D20' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('stores a preset in lower case and keeps what is typed', async () => {
    renderField(<><ColorInput name='brand' field={brand} /><Values /></>, { values: { brand: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Usar #D92D20' }))
    await waitFor(() => expect(stored()).toEqual({ brand: '#d92d20' }))

    fireEvent.change(screen.getByLabelText('Color de marca'), { target: { value: '#ABCDEF' } })
    await waitFor(() => expect(stored()).toEqual({ brand: '#ABCDEF' }))
    expect(screen.getByLabelText('Elegir Color de marca con el selector')).toHaveProperty('value', '#abcdef')
  })

  it('takes the picker value', async () => {
    renderField(<><ColorInput name='brand' field={color({ label: 'Acento' })} /><Values /></>, { values: { brand: '' } })
    expect(screen.queryByRole('group')).toBeNull()
    fireEvent.change(screen.getByLabelText('Elegir Acento con el selector'), { target: { value: '#123456' } })
    await waitFor(() => expect(stored()).toEqual({ brand: '#123456' }))
  })
})
