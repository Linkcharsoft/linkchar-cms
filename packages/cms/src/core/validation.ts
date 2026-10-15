import { fieldDefinition, textContext } from './config'
import { withDefaults } from './defaults'
import { issue } from './kinds/registry'
import { isRecord } from './kinds/shared'
import { resolveText } from './text'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { DataField, FieldsRecord } from './fields'
import type { FieldContextType, IssueType, ValidationModeType } from './kinds/registry'
import type { TextContextType } from './text'

export type { IssueType, ValidationModeType }

interface WalkContextType extends FieldContextType {
  mode: ValidationModeType
}

const join = (path: string, inner: string) => (inner ? `${path}.${inner}` : path)

const at = (path: string, issues: IssueType[]) => issues.map(found => ({ ...found, path: join(path, found.path) }))

const countIssues = (count: number, min: number | undefined, max: number | undefined, ctx: WalkContextType, codes: [string, string], required: boolean) => {
  if (max !== undefined && count > max) return [issue(codes[0], { max })]
  const atLeast = min ?? (required ? 1 : 0)
  return ctx.mode === 'publish' && count < atLeast ? [issue(codes[1], { min: atLeast, count: atLeast })] : []
}

const itemsIssues = (value: unknown, path: string, ctx: WalkContextType, check: (item: Record<string, unknown>, index: number) => IssueType[]) => {
  if (value === undefined || value === null) return { items: [] as unknown[], issues: [] as IssueType[] }
  if (!Array.isArray(value)) return { items: [] as unknown[], issues: [{ ...issue('invalid'), path }] }
  const issues = value.flatMap((item, index) => {
    const itemPath = `${path}.${index}`
    if (!isRecord(item) || typeof item._key !== 'string' || !item._key) return [{ ...issue('invalid'), path: itemPath }]
    return check(item, index)
  })
  return { items: value, issues }
}

const fieldIssues = (field: DataField, value: unknown, path: string, ctx: WalkContextType): IssueType[] => {
  const required = !!field.required

  switch (field.kind) {
    case 'group':
      if (value !== undefined && value !== null && !isRecord(value)) return [{ ...issue('invalid'), path }]
      return walk(field.fields, value, path, ctx)

    case 'list': {
      const { items, issues } = itemsIssues(value, path, ctx, (item, index) => walk(field.fields, item, `${path}.${index}`, ctx))
      return [...at(path, countIssues(items.length, field.min, field.max, ctx, ['maxItems', 'minItems'], required)), ...issues]
    }

    case 'blocks': {
      const { items, issues } = itemsIssues(value, path, ctx, (item, index) => {
        const type = typeof item._type === 'string' ? item._type : ''
        if (!Object.hasOwn(field.blocks, type)) return [{ ...issue('blockType'), path: `${path}.${index}` }]
        return walk(field.blocks[type].fields, item, `${path}.${index}`, ctx)
      })
      return [...at(path, countIssues(items.length, field.min, field.max, ctx, ['maxBlocks', 'minBlocks'], required)), ...issues]
    }

    default: {
      const definition = fieldDefinition(ctx.config, field.kind)
      const current = value === undefined ? definition.defaultValue(field) : value
      return at(path, definition.validate(current, field, { ...ctx, required: ctx.mode === 'publish' && required }))
    }
  }
}

const walk = (fields: FieldsRecord, data: unknown, path: string, ctx: WalkContextType): IssueType[] => {
  const source = isRecord(data) ? data : {}
  return dataFields(fields).flatMap(([key, field]) => fieldIssues(field, source[key], path ? `${path}.${key}` : key, ctx))
}

// Every problem in a document, with full data paths ("hero.items.2.title").
export const validateFields = (config: CmsConfigType, fields: FieldsRecord, data: unknown, mode: ValidationModeType = 'draft'): IssueType[] => {
  const texts = textContext(config)
  return walk(fields, data, '', { config, t: texts.translator.t, text: value => resolveText(value, texts), mode })
}

export const issueMessage = (found: IssueType, ctx: TextContextType): string =>
  (found.message ? resolveText(found.message, ctx) : ctx.translator.translate(`validation.${found.code}`, found.params))

export type ContentErrorsType = Record<string, string>

// One message per path, the first one found, as the form shows them.
export const issuesToErrors = (issues: IssueType[], ctx: TextContextType): ContentErrorsType => {
  const errors: ContentErrorsType = {}
  for (const found of issues) errors[found.path] ??= issueMessage(found, ctx)
  return errors
}

interface ValidateOptionsType {
  mode?: ValidationModeType
  // Language of the messages; the panel's by default.
  locale?: string
}

// Drafts are saved as they are (only formats are checked); required fields block publishing instead.
// On success `value` is the content repaired and without unknown keys, ready to store.
export const validateContent = async (config: CmsConfigType, fields: FieldsRecord, data: unknown, { mode = 'draft', locale }: ValidateOptionsType = {}) => {
  const issues = validateFields(config, fields, data, mode)
  if (issues.length > 0) return { value: null, errors: issuesToErrors(issues, textContext(config, locale)) }
  return { value: withDefaults(config, fields, data) as Record<string, unknown>, errors: null }
}
