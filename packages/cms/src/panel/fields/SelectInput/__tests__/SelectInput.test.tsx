import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useFormikContext } from 'formik'
import { afterEach, describe, expect, it } from 'vitest'
import { select } from '../../../../core/fields'
import { renderField } from '../../../__tests__/render'
import SelectInput from '../SelectInput'

afterEach(cleanup)

const Values = () => <output data-testid='values'>{JSON.stringify(useFormikContext().values)}</output>
const stored = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}')

const layout = select({
  label: 'Disposición',
  display: 'cards',
  options: [
    { label: 'Mosaico', value: 'mosaic', preview: { grid: { columns: 2, rows: 2, cells: [{ column: 1, row: 1, rowSpan: 2 }, { column: 2, row: 1 }, { column: 2, row: 2 }] } } },
    { label: 'Fila', value: 'row', preview: { icon: 'pi-th-large' } },
    { label: 'Foto', value: 'photo', preview: { image: '/layouts/photo.svg' } }
  ]
})

describe('SelectInput as cards', () => {
  it('renders a radio group with one card per option and its preview', () => {
    renderField(<SelectInput name='layout' field={layout} />, { values: { layout: 'row' } })
    const group = screen.getByRole('radiogroup', { name: 'Opciones de Disposición' })
    const radios = screen.getAllByRole('radio')
    expect(radios.map(radio => radio.textContent)).toEqual(['Mosaico', 'Fila', 'Foto'])
    expect(radios.map(radio => radio.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(radios.map(radio => radio.tabIndex)).toEqual([-1, 0, -1])
    expect(group.querySelectorAll('.SelectCards__Cell')).toHaveLength(3)
    expect(group.querySelector('.pi-th-large')).toBeTruthy()
    expect(group.querySelector('img')?.getAttribute('src')).toBe('/layouts/photo.svg')
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('selects with a click and moves with the arrows', async () => {
    renderField(<><SelectInput name='layout' field={layout} /><Values /></>, { values: { layout: null } })
    expect(screen.getAllByRole('radio').map(radio => radio.tabIndex)).toEqual([0, -1, -1])

    fireEvent.click(screen.getByRole('radio', { name: 'Foto' }))
    await waitFor(() => expect(stored()).toEqual({ layout: 'photo' }))

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Foto' }), { key: 'ArrowRight' })
    await waitFor(() => expect(stored()).toEqual({ layout: 'mosaic' }))
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Mosaico' }))

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Mosaico' }), { key: 'ArrowUp' })
    await waitFor(() => expect(stored()).toEqual({ layout: 'photo' }))
  })

  it('keeps the dropdown for a select without cards', () => {
    renderField(<SelectInput name='tone' field={select({ label: 'Tono', options: [{ label: 'Claro', value: 'light' }] })} />, { values: { tone: null } })
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(document.querySelector('[data-pc-name=dropdown]')).toBeTruthy()
  })
})
