import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Formik } from 'formik'
import { afterEach, describe, expect, it } from 'vitest'
import { boolean, select } from '../../../core/fields'
import { renderPanel } from '../../__tests__/render'
import BooleanInput from '../BooleanInput/BooleanInput'
import { EntryContext } from '../entryContext'
import SelectInput from '../SelectInput/SelectInput'
import type { ReactNode } from 'react'

afterEach(cleanup)

const MESSAGE = 'Valor no permitido'

// The editor's Formik: no validation on change, so an input that commits a value has to ask for it.
const renderCommitted = (ui: ReactNode, values: Record<string, unknown>, invalid: (values: Record<string, unknown>) => boolean) =>
  renderPanel(
    <Formik
      initialValues={values}
      initialErrors={Object.fromEntries(Object.keys(values).map(key => [key, MESSAGE]))}
      initialTouched={Object.fromEntries(Object.keys(values).map(key => [key, true]))}
      validateOnChange={false}
      validate={current => (invalid(current) ? Object.fromEntries(Object.keys(values).map(key => [key, MESSAGE])) : {})}
      onSubmit={() => undefined}
    >
      <EntryContext value={{ entryId: null, locale: 'es' }}>{ui}</EntryContext>
    </Formik>
  )

describe('inputs that commit a value revalidate it right away', () => {
  it('clears the error of a switch once it is flipped to an allowed value', async () => {
    renderCommitted(<BooleanInput name='featured' field={boolean({ label: 'Destacado' })} />, { featured: true }, values => values.featured === true)
    expect(screen.getByRole('alert').textContent).toContain(MESSAGE)

    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('clears the error of a select once an allowed option is picked', async () => {
    const topic = select({ label: 'Tema', options: [{ label: 'Obra', value: 'works' }, { label: 'Plazos', value: 'timing' }] })
    const { container } = renderCommitted(<SelectInput name='topic' field={topic} />, { topic: 'timing' }, values => values.topic === 'timing')
    expect(screen.getByRole('alert').textContent).toContain(MESSAGE)

    fireEvent.click(container.querySelector('[data-pc-name=dropdown]') as HTMLElement)
    fireEvent.click(await screen.findByText('Obra'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})
