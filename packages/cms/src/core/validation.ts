import * as Yup from 'yup'
import { WEEK_DAYS } from './fields'
import { isEmptyRichText } from './richText/nodes'
import parseVideoUrl from './video'
import { dataFields } from './walk'
import type { DataField, FieldsRecord, LinkField, LinkKindType } from './fields'
import type { RichTextDocType } from './richText/nodes'

// Drafts are saved as they are (only formats are checked); required fields block publishing instead.
export type ValidationModeType = 'draft' | 'publish'

const REQUIRED = 'Este campo es obligatorio'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHONE = /^\+?[\d\s()-]{6,20}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const HTTP_URL = /^https?:\/\/[^\s/]+\.[^\s]+$/i
const LINK_KINDS: LinkKindType[] = ['internal', 'external', 'email', 'tel', 'anchor']

const isValidDate = (value: string | null | undefined) => !value || !Number.isNaN(Date.parse(value))

const LINK_RULES: Record<LinkKindType, [RegExp, string]> = {
  internal: [/^\/(?!\/)\S*$/, 'Los links internos empiezan con /'],
  external: [HTTP_URL, 'Ingresá una URL que empiece con https://'],
  email: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Ingresá un email válido'],
  tel: [PHONE, 'Ingresá un teléfono válido'],
  anchor: [/^#[\w-]+$/, 'Las anclas empiezan con #']
}

const linkSchema = (field: Pick<LinkField, 'allow'>, required: boolean) => Yup.object({
  type: Yup.mixed<LinkKindType>().oneOf(field.allow ?? LINK_KINDS, 'Tipo de link inválido').defined(),
  href: Yup.string().defined().test('href', function (href) {
    if (!href) return required ? this.createError({ message: REQUIRED }) : true
    const [pattern, message] = LINK_RULES[this.parent.type as LinkKindType] ?? LINK_RULES.external
    return pattern.test(href) || this.createError({ message })
  }),
  newTab: Yup.boolean().defined()
})

const stringSchema = (field: Extract<DataField, { maxLength?: number }>, required: boolean) => {
  let schema = Yup.string().defined()

  if (field.maxLength) schema = schema.max(field.maxLength, `Usá hasta ${field.maxLength} caracteres`)
  if (field.pattern) {
    schema = schema.matches(field.pattern, { message: field.patternMessage ?? 'Formato inválido', excludeEmptyString: true })
  }

  if (field.kind === 'email') schema = schema.email('Ingresá un email válido')
  if (field.kind === 'url') schema = schema.matches(HTTP_URL, { message: 'Ingresá una URL que empiece con https://', excludeEmptyString: true })
  if (field.kind === 'phone') schema = schema.matches(PHONE, { message: 'Ingresá un teléfono válido', excludeEmptyString: true })
  if (field.kind === 'slug') schema = schema.matches(SLUG, { message: 'Usá minúsculas, números y guiones', excludeEmptyString: true })
  if (field.kind === 'video') schema = schema.test('video', 'Pegá un link de YouTube o Vimeo', v => !v || !!parseVideoUrl(v))

  return required ? schema.required(REQUIRED) : schema
}

const fieldSchema = (field: DataField, mode: ValidationModeType): Yup.AnySchema => {
  const required = mode === 'publish' && !!field.required

  switch (field.kind) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
    case 'video':
    case 'slug':
      return stringSchema(field, required)

    case 'richText': {
      const schema = Yup.mixed<RichTextDocType>().nullable()
        .test('doc', 'Contenido inválido', v => v == null || (typeof v === 'object' && v.type === 'doc'))
      return required ? schema.test('required', REQUIRED, v => !isEmptyRichText(v)) : schema
    }

    case 'number': {
      let schema = Yup.number().nullable().typeError('Ingresá un número')
      if (field.min !== undefined) schema = schema.min(field.min, `El mínimo es ${field.min}`)
      if (field.max !== undefined) schema = schema.max(field.max, `El máximo es ${field.max}`)
      return required ? schema.required(REQUIRED) : schema
    }

    case 'boolean':
      return Yup.boolean().defined()

    case 'date':
    case 'datetime': {
      const schema = Yup.string().nullable().test('date', 'Fecha inválida', isValidDate)
      return required ? schema.required(REQUIRED) : schema
    }

    case 'select': {
      const schema = Yup.string().nullable().oneOf([...field.options.map(o => o.value), null], 'Elegí una opción válida')
      return required ? schema.required(REQUIRED) : schema
    }

    case 'multiSelect': {
      let schema = Yup.array(Yup.string().oneOf(field.options.map(o => o.value), 'Elegí una opción válida').defined()).defined()
      if (field.max !== undefined) schema = schema.max(field.max, `Elegí hasta ${field.max}`)
      const min = field.min ?? (required ? 1 : 0)
      return mode === 'publish' && min > 0 ? schema.min(min, min === 1 ? REQUIRED : `Elegí al menos ${min}`) : schema
    }

    case 'link':
      return linkSchema(field, required)

    case 'button':
      return Yup.object({
        label: Yup.string().defined().max(40, 'Usá hasta 40 caracteres').test('label', REQUIRED, v => !required || !!v?.trim()),
        link: linkSchema({}, required),
        variant: Yup.string().oneOf(field.variants.map(v => v.value), 'Variante inválida').defined()
      })

    case 'openingHours':
      return Yup.object({
        days: Yup.array(Yup.object({
          day: Yup.mixed().oneOf([...WEEK_DAYS]).defined(),
          closed: Yup.boolean().defined(),
          from: Yup.string().defined().matches(TIME, { message: 'Usá el formato HH:MM', excludeEmptyString: true }),
          to: Yup.string().defined().matches(TIME, { message: 'Usá el formato HH:MM', excludeEmptyString: true })
            .test('order', 'El cierre tiene que ser posterior a la apertura', function (to) {
              const { from } = this.parent
              return !from || !to || from < to
            })
        })).defined(),
        note: Yup.string().defined().max(200, 'Usá hasta 200 caracteres')
      })

    case 'image':
    case 'file': {
      const schema = Yup.string().matches(UUID, 'Archivo inválido').nullable()
      return required ? schema.required(REQUIRED) : schema
    }

    case 'gallery': {
      let schema = Yup.array(Yup.string().matches(UUID, 'Archivo inválido').defined()).defined()
      if (field.max !== undefined) schema = schema.max(field.max, `Podés elegir hasta ${field.max} imágenes`)
      const min = field.min ?? (required ? 1 : 0)
      return mode === 'publish' && min > 0 ? schema.min(min, min === 1 ? REQUIRED : `Elegí al menos ${min} imágenes`) : schema
    }

    case 'relation': {
      const id = Yup.string().matches(UUID, 'Referencia inválida')
      if (field.multiple) {
        const schema = Yup.array(id.defined()).defined()
        return required ? schema.min(1, REQUIRED) : schema
      }
      const schema = id.nullable()
      return required ? schema.required(REQUIRED) : schema
    }

    case 'group':
      return objectSchema(field.fields, mode)

    case 'list': {
      let schema = Yup.array(objectSchema(field.fields, mode).shape({ _key: Yup.string().required() })).defined()
      if (field.max !== undefined) schema = schema.max(field.max, `Podés cargar hasta ${field.max}`)
      const min = field.min ?? (required ? 1 : 0)
      return mode === 'publish' && min > 0 ? schema.min(min, `Cargá al menos ${min}`) : schema
    }

    case 'blocks': {
      const item = Yup.lazy((value: { _type?: string } | undefined) => {
        const block = value?._type ? field.blocks[value._type] : undefined
        if (!block) return Yup.mixed().test('block', 'Tipo de bloque desconocido', () => false)
        return objectSchema(block.fields, mode).shape({ _key: Yup.string().required(), _type: Yup.string().required() })
      })
      let schema = Yup.array(item).defined()
      if (field.max !== undefined) schema = schema.max(field.max, `Podés cargar hasta ${field.max} bloques`)
      const min = field.min ?? (required ? 1 : 0)
      return mode === 'publish' && min > 0 ? schema.min(min, `Cargá al menos ${min} bloque${min > 1 ? 's' : ''}`) : schema
    }
  }
}

const objectSchema = (fields: FieldsRecord, mode: ValidationModeType) =>
  Yup.object(Object.fromEntries(dataFields(fields).map(([key, field]) => [key, fieldSchema(field, mode)])))

export const buildYupSchema = (fields: FieldsRecord, mode: ValidationModeType = 'draft') => objectSchema(fields, mode)

// Yup reports array paths as items[0].title; the form and the labels use items.0.title.
export const normalizePath = (path: string) => path.replace(/\[(\d+)\]/g, '.$1')

export type ContentErrorsType = Record<string, string>

export const validateContent = async (fields: FieldsRecord, data: unknown, mode: ValidationModeType = 'draft') => {
  try {
    const value = await buildYupSchema(fields, mode).validate(data, { abortEarly: false, stripUnknown: true })
    return { value: value as Record<string, unknown>, errors: null }
  } catch (error) {
    if (!(error instanceof Yup.ValidationError)) throw error
    const errors: ContentErrorsType = {}
    for (const inner of error.inner.length ? error.inner : [error]) {
      const path = normalizePath(inner.path ?? '')
      errors[path] ??= inner.message
    }
    return { value: null, errors }
  }
}
