import type { MessageKeyType, ParamValueType, TranslateArgsType, TranslatorType } from './i18n/types'

// A text from the package catalog, resolved in the language of whoever reads it.
export interface MessageRefType {
  $msg: MessageKeyType
  params?: Record<string, ParamValueType>
}

export type LocalizedTextType = { readonly [locale: string]: string }

// Schema labels and help: one text, one per language ({ es, en }) or a catalog message.
export type TextType = string | LocalizedTextType | MessageRefType

export const msg = <K extends MessageKeyType>(key: K, ...args: TranslateArgsType<K>): MessageRefType =>
  (args[0] ? { $msg: key, params: args[0] as Record<string, ParamValueType> } : { $msg: key })

export const isMessageRef = (value: unknown): value is MessageRefType =>
  typeof value === 'object' && value !== null && typeof (value as MessageRefType).$msg === 'string'

export interface TextContextType {
  locale: string
  // Used when a { es, en } text lacks the asked locale.
  defaultLocale: string
  translator: TranslatorType
}

export const resolveText = (text: TextType | undefined, ctx: TextContextType): string => {
  if (text === undefined) return ''
  if (typeof text === 'string') return text
  if (isMessageRef(text)) return ctx.translator.translate(text.$msg, text.params)
  return text[ctx.locale] ?? text[ctx.defaultLocale] ?? Object.values(text)[0] ?? ''
}
