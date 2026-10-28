import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useFormikContext } from 'formik'
import { afterEach, describe, expect, it } from 'vitest'
import { slug } from '../../../core/fields'
import { renderField } from '../../__tests__/render'
import SlugInput from '../SlugInput/SlugInput'

afterEach(cleanup)

const address = slug({ label: 'Direccion', from: 'title' })

// Types a new title the way TextInput would.
const Retitle = () => {
  const { setFieldValue } = useFormikContext()
  return <button type='button' onClick={() => void setFieldValue('title.es', 'Casa grande')}>retitle</button>
}

const values = { title: { es: 'Casa' }, slug: { es: 'casa' } }

describe('SlugInput', () => {
  it('follows the title while the document was never published', async () => {
    renderField(<><SlugInput name='slug' field={address} /><Retitle /></>, { values })
    fireEvent.click(screen.getByText('retitle'))
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveProperty('value', 'casa-grande'))
    expect(screen.queryByRole('button', { name: 'Generar de nuevo' })).toBeNull()
  })

  it('keeps a published address when the title changes, and regenerates it only on request', async () => {
    renderField(<><SlugInput name='slug' field={address} /><Retitle /></>, { values, published: true })
    fireEvent.click(screen.getByText('retitle'))
    await waitFor(() => expect(screen.getByText('retitle')).toBeTruthy())
    expect(screen.getByRole('textbox')).toHaveProperty('value', 'casa')

    fireEvent.click(screen.getByRole('button', { name: 'Generar de nuevo' }))
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveProperty('value', 'casa-grande'))
    expect(screen.getByRole('button', { name: 'Generar de nuevo' })).toBeTruthy()
  })
})
