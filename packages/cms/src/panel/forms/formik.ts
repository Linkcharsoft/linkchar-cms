'use client'
import { resolveText } from '../../core/text'
import { useTextContext } from '../client/context'
import type { FormResultType } from '../../core/forms'
import type { FormikProps, FormikTouched } from 'formik'
import type { FormEvent } from 'react'

// Formik's `validate` from a core form validator: the same checks the server action runs, in the panel language.
export const useFormValidation = <T>(validator: (input: unknown) => FormResultType<T>) => {
  const ctx = useTextContext()
  return (values: T) => {
    const { errors } = validator(values)
    if (!errors) return {}
    return Object.fromEntries(Object.entries(errors).map(([key, ref]) => [key, resolveText(ref as Parameters<typeof resolveText>[0], ctx)]))
  }
}

// Moves focus to the first invalid field after a failed submit (a11y); field names double as input ids.
export const submitWithFocus = <T extends object>(formik: FormikProps<T>, fieldOrder: (keyof T & string)[]) =>
  async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = await formik.validateForm()
    const firstInvalid = fieldOrder.find(field => errors[field])

    if (firstInvalid) {
      formik.setTouched(Object.fromEntries(fieldOrder.map(field => [field, true])) as FormikTouched<T>, false)
      document.getElementById(firstInvalid)?.focus()
      return
    }

    formik.handleSubmit()
  }
