import type {
  BlockDef,
  BlocksField,
  BooleanField,
  ButtonField,
  ButtonValueType,
  DataField,
  DateField,
  DatetimeField,
  EmailField,
  FieldsRecord,
  GroupField,
  LinkField,
  LinkValueType,
  ListField,
  MultiSelectField,
  NoteLayout,
  NumberField,
  PanelLayout,
  OpeningHoursField,
  FileField,
  GalleryField,
  ImageField,
  OpeningHoursValueType,
  PhoneField,
  RelationField,
  RichTextField,
  RowLayout,
  SelectField,
  SlugField,
  TabLayout,
  TextareaField,
  TextField,
  UrlField,
  VideoField
} from './fields'
import type { RichTextDocType } from './richText/nodes'

type Simplify<T> = { [K in keyof T]: T[K] } & {}

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never

type StringFields = TextField | TextareaField | EmailField | PhoneField | UrlField | VideoField | SlugField

export type ListItemType<F extends FieldsRecord> = Simplify<{ _key: string } & ValuesOf<F>>

export type BlockItemType<B extends Record<string, BlockDef>> = {
  [T in keyof B & string]: Simplify<{ _key: string, _type: T } & ValuesOf<B[T]['fields']>>
}[keyof B & string]

export type FieldValue<F extends DataField> =
  F extends StringFields ? string
    : F extends RichTextField ? RichTextDocType | null
      : F extends NumberField ? number | null
        : F extends BooleanField ? boolean
          : F extends DateField | DatetimeField ? string | null
            : F extends SelectField<infer V> ? V | null
              : F extends MultiSelectField<infer V> ? V[]
                : F extends LinkField ? LinkValueType
                  : F extends ButtonField<infer V> ? ButtonValueType<V>
                    : F extends OpeningHoursField ? OpeningHoursValueType
                      : F extends ImageField | FileField ? string | null
                        : F extends GalleryField ? string[]
                          : F extends RelationField<infer M> ? (M extends true ? string[] : string | null)
                            : F extends GroupField<infer G> ? ValuesOf<G>
                              : F extends ListField<infer L> ? ListItemType<L>[]
                                : F extends BlocksField<infer B> ? BlockItemType<B>[]
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
  { [K in DataKeys<F>]: F[K] extends DataField ? FieldValue<F[K]> : never }
  & ([NestedKeys<F>] extends [never] ? unknown : NestedValues<F>)
>
