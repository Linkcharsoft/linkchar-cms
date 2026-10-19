import type { EntryIdType, RegisteredSchemaType } from '../core/config'
import type { BlockDef, BlocksField, FieldsRecord, GroupField, ListField, NoteLayout, PanelLayout, RowLayout, TabLayout } from '../core/fields'
import type { FieldValue } from '../core/infer'
import type { RichTextDocType } from '../core/richText/nodes'

type Simplify<T> = { [K in keyof T]: T[K] } & {}

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never

export interface SiteImageType {
  id: string
  src: string
  // In the locale being read, or the default locale's while it is missing.
  alt: string
  caption: string
  width: number | null
  height: number | null
  // 0–100 from the left and the top, for object-position; null when nobody set one.
  focalX: number | null
  focalY: number | null
  blurDataUrl: string | null
}

export interface SiteFileType {
  id: string
  src: string
  filename: string
  mime: string
  size: number
}

export interface SiteLinkType {
  // '' when the link points to something that is not on the site (unpublished, removed or empty).
  href: string
  newTab: boolean
  // Another site: rel="noopener noreferrer" and an external icon are up to the project.
  external: boolean
}

export interface SiteButtonType<V extends string = string> {
  label: string
  variant: V
  link: SiteLinkType
}

// Rich text with its images and links resolved: image attrs carry src, alt and size, link marks a real href.
export type SiteRichTextType = RichTextDocType

type VariantOf<F> = F extends { variants: readonly { value: infer V extends string }[] } ? V : string

type SiteLeafType<F> =
  F extends { kind: 'image' } ? SiteImageType | null
    : F extends { kind: 'gallery' } ? SiteImageType[]
      : F extends { kind: 'file' } ? SiteFileType | null
        : F extends { kind: 'link' } ? SiteLinkType
          : F extends { kind: 'button' } ? SiteButtonType<VariantOf<F>>
            : F extends { kind: 'richText' } ? SiteRichTextType | null
              : FieldValue<F>

export type SiteListItemType<F extends FieldsRecord> = Simplify<{ _key: string } & SiteValuesOf<F>>

export type SiteBlockItemType<B extends Record<string, BlockDef>> = {
  [T in keyof B & string]: Simplify<{ _key: string, _type: T } & SiteValuesOf<B[T]['fields']>>
}[keyof B & string]

export type SiteFieldValue<F> =
  F extends GroupField<infer G> ? SiteValuesOf<G>
    : F extends ListField<infer L> ? SiteListItemType<L>[]
      : F extends BlocksField<infer B> ? SiteBlockItemType<B>[]
        : SiteLeafType<F>

type DataKeys<F extends FieldsRecord> = {
  [K in keyof F]: F[K] extends TabLayout | PanelLayout | RowLayout | NoteLayout ? never : K
}[keyof F]

type NestedKeys<F extends FieldsRecord> = {
  [K in keyof F]: F[K] extends TabLayout | PanelLayout | RowLayout ? K : never
}[keyof F]

type NestedValues<F extends FieldsRecord> = UnionToIntersection<{
  [K in NestedKeys<F>]: F[K] extends TabLayout<infer Inner> | PanelLayout<infer Inner> | RowLayout<infer Inner> ? SiteValuesOf<Inner> : never
}[NestedKeys<F>]>

// What the site reads in one locale: like ValuesOf, with media, links and rich text ready to render.
export type SiteValuesOf<F extends FieldsRecord> = Simplify<
  { [K in DataKeys<F>]: SiteFieldValue<F[K]> }
  & ([NestedKeys<F>] extends [never] ? unknown : NestedValues<F>)
>

export type SiteContentOf<K extends EntryIdType> = RegisteredSchemaType[K] extends { fields: infer F extends FieldsRecord } ? SiteValuesOf<F> : never

export interface SiteDocumentType<K extends EntryIdType = EntryIdType> {
  id: string | null
  entry: K
  locale: string
  // The document's slug in this locale; null for pages and singletons.
  slug: string | null
  // Its URL in this locale and in every locale it has one, for the language switch and hreflang.
  path: string | null
  urls: Record<string, string>
  publishedAt: string | null
  // Read from the draft (Draft Mode, signed in to the panel) instead of the published copy.
  draft: boolean
  content: SiteContentOf<K>
}
