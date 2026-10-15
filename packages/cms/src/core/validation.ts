import { fieldDefinition, textContext } from './config'
import { withDefaults } from './defaults'
import { isStructural } from './fields'
import { languageName } from './i18n/translator'
import { issue } from './kinds/registry'
import { isRecord } from './kinds/shared'
import { fieldLocalize, leafVariants, missingInLeaf } from './locales'
import { resolveText } from './text'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { DataField, FieldCheckContextType, FieldsRecord, FieldValidatorType } from './fields'
import type { FieldContextType, IssueType, LeafField, ValidationModeType } from './kinds/registry'
import type { TextContextType } from './text'

export type { IssueType, ValidationModeType }

type CheckType = () => Promise<IssueType | null>

interface WalkContextType extends FieldContextType {
  mode: ValidationModeType
  document: Record<string, unknown>
  // Project validators, run after the walk because they may be async.
  checks: CheckType[]
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

const queueCheck = (field: DataField, value: unknown, path: string, parent: Record<string, unknown>, ctx: WalkContextType, locale?: string) => {
  const { validate } = field
  if (!validate) return
  ctx.checks.push(async () => {
    const check = validate as (value: unknown, check: FieldCheckContextType) => ReturnType<FieldValidatorType<unknown>>
    const message = await check(value, { mode: ctx.mode, document: ctx.document, parent, locale: locale ?? ctx.config.defaultLocale })
    return message ? { path, code: 'custom', message, ...(locale ? { locale } : {}) } : null
  })
}

const belongsTo = (parts: string[] | null, path: string) => parts === null || parts.some(part => path === part || path.startsWith(`${part}.`))

// Each locale's value is checked on its own; emptiness only in the default one, translations by missingInLeaf.
const leafIssues = (field: LeafField, value: unknown, path: string, parent: Record<string, unknown>, ctx: WalkContextType): IssueType[] => {
  const definition = fieldDefinition(ctx.config, field.kind)
  const localized = fieldLocalize(ctx.config, field) !== false
  const required = ctx.mode === 'publish' && !!field.required
  const issues: IssueType[] = []

  for (const variant of leafVariants(ctx.config, field, value)) {
    const current = variant.value === undefined ? definition.defaultValue(field) : variant.value
    const found = definition.validate(current, field, { ...ctx, required: required && variant.primary })
      .filter(item => belongsTo(variant.parts, item.path))
      .map(item => ({ ...item, path: join(path, variant.path(item.path)), ...(localized ? { locale: variant.locale } : {}) }))
    issues.push(...found)
    if (found.length === 0 && variant.parts === null) queueCheck(field, current, join(path, variant.path('')), parent, ctx, localized ? variant.locale : undefined)
  }

  if (ctx.mode === 'publish') {
    issues.push(...missingInLeaf(ctx.config, field, value).map(missing => ({ path: join(path, missing.path), code: 'translationMissing', locale: missing.locale })))
  }
  return issues
}

const fieldIssues = (field: DataField, value: unknown, path: string, parent: Record<string, unknown>, ctx: WalkContextType): IssueType[] => {
  if (!isStructural(field)) return leafIssues(field, value, path, parent, ctx)
  const issues = structuralIssues(field, value, path, ctx)
  if (issues.length === 0) queueCheck(field, value, path, parent, ctx)
  return issues
}

const structuralIssues = (field: DataField, value: unknown, path: string, ctx: WalkContextType): IssueType[] => {
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

    default:
      return []
  }
}

const walk = (fields: FieldsRecord, data: unknown, path: string, ctx: WalkContextType): IssueType[] => {
  const source = isRecord(data) ? data : {}
  return dataFields(fields).flatMap(([key, field]) => fieldIssues(field, source[key], path ? `${path}.${key}` : key, source, ctx))
}

// Every problem in a document, with full data paths ("hero.items.2.title").
export const validateFields = async (config: CmsConfigType, fields: FieldsRecord, data: unknown, mode: ValidationModeType = 'draft'): Promise<IssueType[]> => {
  const texts = textContext(config)
  const ctx: WalkContextType = {
    config,
    t: texts.translator.t,
    text: value => resolveText(value, texts),
    mode,
    document: isRecord(data) ? data : {},
    checks: []
  }
  const issues = walk(fields, data, '', ctx)
  const custom = await Promise.all(ctx.checks.map(check => check()))
  return [...issues, ...custom.filter(found => found !== null)]
}

export const issueMessage = (found: IssueType, ctx: TextContextType): string => {
  if (found.message) return resolveText(found.message, ctx)
  const language = found.locale ? languageName(found.locale, ctx.locale) : ''
  return ctx.translator.translate(`validation.${found.code}`, { language, ...found.params })
}

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
  const issues = await validateFields(config, fields, data, mode)
  if (issues.length > 0) return { value: null, errors: issuesToErrors(issues, textContext(config, locale)) }
  return { value: withDefaults(config, fields, data) as Record<string, unknown>, errors: null }
}
