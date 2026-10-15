import { defineField, issue, noReferences } from '@linkcharsoft/cms/core'
import type { BaseOptions } from '@linkcharsoft/cms/core'

// A project kind: proves a field type can be added without touching the package.
export interface ColorField extends BaseOptions<string> {
  kind: 'color'
  swatches?: readonly string[]
}

declare module '@linkcharsoft/cms/core' {
  interface FieldTypes<F> {
    color: { field: ColorField, value: string, localize: false }
  }
}

const HEX = /^#[0-9a-f]{6}$/i

export const color = defineField({
  kind: 'color',
  localize: false,
  defaultValue: () => '',
  normalize: value => (typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : ''),
  isEmpty: value => typeof value !== 'string' || !value,
  validate: (value, _field, ctx) => {
    if (value === null || value === undefined || value === '') return ctx.required ? [issue('required')] : []
    return typeof value === 'string' && HEX.test(value) ? [] : [{ ...issue('pattern'), message: { es: 'Usá un color como #1f5fa8', en: 'Use a color like #1f5fa8' } }]
  },
  references: noReferences,
  summarize: value => String(value).toUpperCase()
})
