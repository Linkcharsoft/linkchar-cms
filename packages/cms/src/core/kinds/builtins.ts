import { boolean } from './boolean'
import { button } from './button'
import { color } from './color'
import { date, datetime } from './dates'
import { link } from './link'
import { file, gallery, image, videoFile } from './media'
import { number } from './number'
import { relationField } from './relation'
import { richText } from './richText'
import { multiSelect, select } from './select'
import { email, phone, slug, text, textarea, url, video } from './strings'
import type { FieldDefinitionType } from './registry'

// Kinds every project gets; opt-in ones (openingHours) and project kinds come from the config's `fields`.
export const BUILTIN_FIELDS: readonly FieldDefinitionType[] = [
  text, textarea, email, phone, url, video, slug,
  richText, number, boolean, date, datetime,
  select, multiSelect, color, link, button,
  image, gallery, file, videoFile, relationField
]
