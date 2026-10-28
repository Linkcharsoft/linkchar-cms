import en from './en'
import es from './es'
import type { MessageOverridesType, MessagesType, ParamValueType, PluralMessageType, TranslatorType } from './types'

export const CATALOGS: Record<string, MessagesType> = { es, en }

export const FALLBACK_LOCALE = 'es'

type TreeType = { [key: string]: unknown }

const lookup = (tree: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (typeof node === 'object' && node !== null ? (node as TreeType)[part] : undefined), tree)

const isPlural = (value: unknown): value is PluralMessageType =>
  typeof value === 'object' && value !== null && typeof (value as TreeType).other === 'string'

const pluralRules = new Map<string, Intl.PluralRules>()

const pluralForm = (locale: string, count: number) => {
  let rules = pluralRules.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRules.set(locale, rules)
  }
  return rules.select(count)
}

const interpolate = (template: string, params: Record<string, ParamValueType>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))

// Lookup order: the project's overrides, the package catalog for the locale, then Spanish.
export const createTranslator = ({ locale, overrides = {} }: { locale: string, overrides?: MessageOverridesType }): TranslatorType => {
  const sources = [overrides[locale], CATALOGS[locale], overrides[FALLBACK_LOCALE], CATALOGS[FALLBACK_LOCALE]]

  const translate = (key: string, params: Record<string, ParamValueType> = {}) => {
    const message = sources.map(source => lookup(source, key)).find(value => typeof value === 'string' || isPlural(value))
    if (typeof message === 'string') return interpolate(message, params)
    if (!isPlural(message)) return key
    const form = pluralForm(locale, Number(params.count ?? 0))
    return interpolate(message[form] ?? message.other, params)
  }

  return {
    locale,
    translate,
    t: (key, ...args) => translate(key, args[0] as Record<string, ParamValueType> | undefined)
  }
}

// "a, b y c" in the panel language; `type` 'disjunction' gives "a, b o c".
export const formatList = (locale: string, items: string[], type: Intl.ListFormatType = 'conjunction') =>
  new Intl.ListFormat(locale, { type }).format(items)

// The same list as parts, so each item can be rendered as a link or any node.
export const listParts = (locale: string, items: string[], type: Intl.ListFormatType = 'conjunction') =>
  new Intl.ListFormat(locale, { type }).formatToParts(items)

export const languageName = (language: string, displayLocale: string): string => {
  const name = new Intl.DisplayNames([displayLocale], { type: 'language' }).of(language) ?? language
  return name.charAt(0).toLocaleUpperCase(displayLocale) + name.slice(1)
}
