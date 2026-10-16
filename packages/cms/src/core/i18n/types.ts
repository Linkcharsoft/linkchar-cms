import type es from './es'

type PluralFormType = 'zero' | 'one' | 'two' | 'few' | 'many'

export type PluralMessageType = { other: string } & Partial<Record<PluralFormType, string>>

// The shape a translation must match: same keys as the Spanish mold, any text.
export type CatalogType<T> = T extends string
  ? string
  : T extends { other: string } ? PluralMessageType : { -readonly [K in keyof T]: CatalogType<T[K]> }

export type MessagesType = CatalogType<typeof es>

type DeepPartialType<T> = T extends string | PluralMessageType ? T : { [K in keyof T]?: DeepPartialType<T[K]> }

export type MessageOverridesType = Partial<Record<string, DeepPartialType<MessagesType>>>

type LeafPathsType<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | { other: string } ? `${P}${K}` : LeafPathsType<T[K], `${P}${K}.`>
}[keyof T & string]

export type MessageKeyType = LeafPathsType<typeof es>

type AtType<T, K extends string> = K extends `${infer H}.${infer R}`
  ? H extends keyof T ? AtType<T[H], R> : never
  : K extends keyof T ? T[K] : never

type PlaceholdersType<S> = S extends `${string}{${infer P}}${infer R}` ? P | PlaceholdersType<R> : never

type ParamNamesType<M> = M extends string
  ? PlaceholdersType<M>
  : 'count' | { [F in keyof M]: PlaceholdersType<M[F]> }[keyof M]

export type ParamValueType = string | number

export type MessageParamsType<K extends MessageKeyType> = { [P in ParamNamesType<AtType<typeof es, K>>]: ParamValueType }

export type TranslateArgsType<K extends MessageKeyType> = [ParamNamesType<AtType<typeof es, K>>] extends [never]
  ? []
  : [params: MessageParamsType<K>]

export interface TranslatorType {
  locale: string
  t: <K extends MessageKeyType>(key: K, ...args: TranslateArgsType<K>) => string
  // For keys built at runtime (issue codes); an unknown key comes back as is.
  translate: (key: string, params?: Record<string, ParamValueType>) => string
}
