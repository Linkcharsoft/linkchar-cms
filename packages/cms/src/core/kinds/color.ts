import { defineField, issue, noReferences } from './registry'
import { nullableIssues } from './shared'
import type { BaseOptions } from '../fields'

export interface ColorField extends BaseOptions<string> {
  kind: 'color'
  // Swatches the editor can pick with one click, as #rrggbb.
  presets?: readonly string[]
}

declare module './registry' {
  interface FieldTypes<F> {
    color: { field: ColorField, value: string, localize: false }
  }
}

export const HEX_COLOR = /^#[0-9a-f]{6}$/i

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX_COLOR.test(value)

export const color = defineField({
  kind: 'color',
  localize: false,
  defaultValue: () => '',
  normalize: value => (isHexColor(value) ? value.toLowerCase() : ''),
  isEmpty: value => !isHexColor(value),
  validate: (value, _field, ctx) => nullableIssues(value, ctx, current => (isHexColor(current) ? null : issue('color'))),
  references: noReferences,
  summarize: value => (isHexColor(value) ? value.toUpperCase() : '')
})
