import type { BlockDef, BlocksField, FieldsRecord, GroupField, ListField, NoteLayout, PanelLayout, RowLayout, TabLayout } from './fields'
import type { FieldTypes, LeafKindType } from './kinds/registry'
import type { LocalizedType } from './locales'

type Simplify<T> = { [K in keyof T]: T[K] } & {}

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never

export type ListItemType<F extends FieldsRecord, S extends boolean = false> = Simplify<{ _key: string } & ValuesOf<F, S>>

export type BlockItemType<B extends Record<string, BlockDef>, S extends boolean = false> = {
  [T in keyof B & string]: Simplify<{ _key: string, _type: T } & ValuesOf<B[T]['fields'], S>>
}[keyof B & string]

// The field's own `localized` wins over its kind's default.
type LocalizeOfField<F, K extends LeafKindType> = F extends { localized: false } ? false
  : F extends { localized: true } ? (FieldTypes[K]['localize'] extends false ? 'translate' : FieldTypes[K]['localize'])
    : FieldTypes[K]['localize']

type StoredLeafType<V, M> = M extends 'translate' | 'inherit' ? LocalizedType<V>
  : M extends Record<string, 'translate'> ? { [P in keyof V]: P extends keyof M ? LocalizedType<V[P]> : V[P] }
    : V

// Leaf values come from the kind's FieldTypes entry, which sees the field as written (its options).
// S: the stored shape, with localized values as maps; otherwise the shape the site reads in one locale.
export type FieldValue<F, S extends boolean = false> =
  F extends GroupField<infer G> ? ValuesOf<G, S>
    : F extends ListField<infer L> ? ListItemType<L, S>[]
      : F extends BlocksField<infer B> ? BlockItemType<B, S>[]
        : F extends { kind: infer K extends LeafKindType }
          ? S extends true ? StoredLeafType<FieldTypes<F>[K]['value'], LocalizeOfField<F, K>> : FieldTypes<F>[K]['value']
          : never

type DataKeys<F extends FieldsRecord> = {
  [K in keyof F]: F[K] extends TabLayout | PanelLayout | RowLayout | NoteLayout ? never : K
}[keyof F]

type NestedKeys<F extends FieldsRecord> = {
  [K in keyof F]: F[K] extends TabLayout | PanelLayout | RowLayout ? K : never
}[keyof F]

type NestedValues<F extends FieldsRecord, S extends boolean> = UnionToIntersection<{
  [K in NestedKeys<F>]: F[K] extends TabLayout<infer Inner> | PanelLayout<infer Inner> | RowLayout<infer Inner> ? ValuesOf<Inner, S> : never
}[NestedKeys<F>]>

// Tabs, panels and rows are flattened: their fields live at the same level as their siblings.
export type ValuesOf<F extends FieldsRecord, S extends boolean = false> = Simplify<
  { [K in DataKeys<F>]: FieldValue<F[K], S> }
  & ([NestedKeys<F>] extends [never] ? unknown : NestedValues<F, S>)
>

export type StoredValuesOf<F extends FieldsRecord> = ValuesOf<F, true>
