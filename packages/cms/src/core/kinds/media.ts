import { defineField, issue } from './registry'
import { countIssues, isUuid, nullableIssues, strings } from './shared'
import type { BaseOptions } from '../fields'
import type { IssueType } from './registry'

// Media fields store `media.id`; caption and focal point live on the media row and are shared by every use.
interface MediaOptions<V> extends BaseOptions<V> {
  // Folder preselected when uploading from this field (one of the config's mediaFolders).
  folder?: string
}

export interface ImageField extends MediaOptions<string | null> { kind: 'image', focalPoint?: boolean }
export interface GalleryField extends MediaOptions<string[]> { kind: 'gallery', min?: number, max?: number }
export interface FileField extends MediaOptions<string | null> { kind: 'file' }

declare module './registry' {
  interface FieldTypes<F> {
    image: { field: ImageField, value: string | null, localize: 'inherit' }
    gallery: { field: GalleryField, value: string[], localize: 'inherit' }
    file: { field: FileField, value: string | null, localize: 'inherit' }
  }
}

const singleMedia = <K extends 'image' | 'file'>(kind: K) => defineField<K>({
  kind,
  localize: 'inherit',
  defaultValue: () => null,
  normalize: value => (typeof value === 'string' && value ? value : null),
  isEmpty: value => typeof value !== 'string' || !value,
  validate: (value, _field, ctx) => nullableIssues(value, ctx, current => (isUuid(current) ? null : issue('file'))),
  references: value => ({ media: strings([value]) }),
  summarize: (value, _field, { names, t }) => names.media?.[value as string] ?? t('diff.otherFile')
})

export const image = singleMedia('image')
export const file = singleMedia('file')

export const gallery = defineField({
  kind: 'gallery',
  localize: 'inherit',
  defaultValue: () => [],
  normalize: value => strings(value),
  isEmpty: value => strings(value).length === 0,
  validate: (value, field, ctx) => {
    if (value === undefined || value === null) value = []
    if (!Array.isArray(value)) return [issue('invalid')]
    const invalid = value.flatMap((item, index): IssueType[] => (isUuid(item) ? [] : [issue('file', undefined, String(index))]))
    return [...invalid, ...countIssues(value.length, field, ctx, { max: 'maxImages', min: 'minImages' })]
  },
  references: value => ({ media: strings(value) }),
  summarize: (value, _field, { t }) => t('diff.images', { count: strings(value).length })
})
