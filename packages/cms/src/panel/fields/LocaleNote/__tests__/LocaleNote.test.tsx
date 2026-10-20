import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { button, email, text, textarea } from '../../../../core/fields'
import { renderField } from '../../../__tests__/render'
import ButtonInput from '../../ButtonInput/ButtonInput'
import TextInput from '../../TextInput/TextInput'

afterEach(cleanup)

const title = text({ label: 'Título' })
const mail = email({ label: 'Email' })

describe('LocaleNote', () => {
  it('shows the original above a translation and describes the input with it', () => {
    renderField(<TextInput name='title' field={title} />, { values: { title: { es: 'Casa de campo', en: '' } }, locale: 'en' })
    const original = screen.getByText('Casa de campo')
    expect(original.closest('.LocaleOriginal')?.textContent).toContain('Español')
    expect(screen.getByLabelText('Título').getAttribute('aria-describedby')).toBe('cms-title-original')
  })

  it('says when the original is empty', () => {
    renderField(<TextInput name='title' field={title} />, { values: { title: { es: '', en: '' } }, locale: 'en' })
    expect(screen.getByText('Sin texto en Español.')).toBeTruthy()
  })

  it('cuts a long original and shows it whole on request', () => {
    const long = 'Una casa con patio. '.repeat(20).trim()
    renderField(<TextInput name='body' field={textarea({ label: 'Texto' })} />, { values: { body: { es: long, en: '' } }, locale: 'en' })
    expect(screen.queryByText(long)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ver completo' }))
    expect(screen.getByText(long)).toBeTruthy()
  })

  it('marks shared values while translating', () => {
    renderField(<TextInput name='mail' field={mail} />, { values: { mail: 'hola@estudio.com' }, locale: 'en' })
    expect(screen.getByText('Igual en todos los idiomas')).toBeTruthy()
  })

  it('shows nothing in the default language', () => {
    renderField(<><TextInput name='title' field={title} /><TextInput name='mail' field={mail} /></>, {
      values: { title: { es: 'Casa', en: 'House' }, mail: 'hola@estudio.com' }
    })
    expect(screen.queryByText('Igual en todos los idiomas')).toBeNull()
    expect(document.querySelector('.LocaleOriginal')).toBeNull()
  })

  it('splits a button: its text is translated, its style and link are shared', () => {
    const cta = button({ label: 'Botón', variants: [{ label: 'Principal', value: 'primary' }, { label: 'Secundario', value: 'secondary' }] })
    renderField(<ButtonInput name='cta' field={cta} />, {
      values: { cta: { label: { es: 'Ver obras', en: '' }, variant: 'primary', link: { type: 'internal', href: '/obras', newTab: false } } },
      locale: 'en'
    })
    expect(screen.getByText('Ver obras')).toBeTruthy()
    expect(screen.getAllByText('Igual en todos los idiomas')).toHaveLength(2)
  })
})
