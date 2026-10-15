import type { BlockDef, BlocksField, FieldsRecord, GroupField, ListField, NoteLayout, PanelLayout, RowLayout, TabLayout } from './fields'
import type { FieldTypes, LeafKindType } from './kinds/registry'

type Simplify<T> = { [K in keyof T]: T[K] } & {}

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never

export type ListItemType<F extends FieldsRecord> = Simplify<{ _key: string } & ValuesOf<F>>

export type BlockItemType<B extends Record<string, BlockDef>> = {
  [T in keyof B & string]: Simplify<{ _key: string, _type: T } & ValuesOf<B[T]['fields']>>
}[keyof B & string]

// Leaf values come from the kind's FieldTypes entry, which sees the field as written (its options).
export type FieldValue<F> =
  F extends GroupField<infer G> ? ValuesOf<G>
    : F extends ListField<infer L> ? ListItemType<L>[]
      : F extends BlocksField<infer B> ? BlockItemType<B>[]
        : F extends { kind: infer K extends LeafKindType } ? FieldTypes<F>[K]['value']
          : never

type DataKeys<F extends FieldsRecord> = {
  [K in keyof F]: F[K] extends TabLayout | PanelLayout | RowLayout | NoteLayout ? never : K
}[keyof F]

type NestedKeys<F extends FieldsRecord> = {
  [K in keyof F]: F[K] extends TabLayout | PanelLayout | RowLayout ? K : never
}[keyof F]

type NestedValues<F extends FieldsRecord> = UnionToIntersection<{
  [K in NestedKeys<F>]: F[K] extends TabLayout<infer Inner> | PanelLayout<infer Inner> | RowLayout<infer Inner> ? ValuesOf<Inner> : never
}[NestedKeys<F>]>

// Tabs, panels and rows are flattened: their fields live at the same level as their siblings.
export type ValuesOf<F extends FieldsRecord> = Simplify<
  { [K in DataKeys<F>]: FieldValue<F[K]> }
  & ([NestedKeys<F>] extends [never] ? unknown : NestedValues<F>)
>
