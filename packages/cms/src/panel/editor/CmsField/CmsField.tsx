'use client'
import { lazy, Suspense } from 'react'
import { useCms } from '../../client/context'
import BlocksInput from '../../fields/BlocksInput/BlocksInput'
import BooleanInput from '../../fields/BooleanInput/BooleanInput'
import ButtonInput from '../../fields/ButtonInput/ButtonInput'
import ColorInput from '../../fields/ColorInput/ColorInput'
import DateInput from '../../fields/DateInput/DateInput'
import GalleryInput from '../../fields/GalleryInput/GalleryInput'
import GroupInput from '../../fields/GroupInput/GroupInput'
import LinkFieldInput from '../../fields/LinkInput/LinkFieldInput'
import ListInput from '../../fields/ListInput/ListInput'
import MediaInput from '../../fields/MediaInput/MediaInput'
import NumberInput from '../../fields/NumberInput/NumberInput'
import OpeningHoursInput from '../../fields/OpeningHoursInput/OpeningHoursInput'
import RelationInput from '../../fields/RelationInput/RelationInput'
import RichTextInput from '../../fields/RichTextInput/RichTextInput'
import SelectInput from '../../fields/SelectInput/SelectInput'
import SlugInput from '../../fields/SlugInput/SlugInput'
import TextInput from '../../fields/TextInput/TextInput'
import SkeletonBlock from '../../primitives/SkeletonBlock/SkeletonBlock'
import type { DataField } from '../../../core/fields'
import type { FieldInputLoaderType } from '../../../core/kinds/registry'
import type { ComponentType } from 'react'

// What every field input receives, the package's and the project's: Formik's useField(name) reads its value.
export interface FieldInputPropsType<F = DataField> {
  name: string
  field: F
}

type InputType = ComponentType<FieldInputPropsType<never>>

const BUILTIN_INPUTS: Partial<Record<string, InputType>> = {
  text: TextInput,
  textarea: TextInput,
  email: TextInput,
  phone: TextInput,
  url: TextInput,
  video: TextInput,
  slug: SlugInput,
  number: NumberInput,
  boolean: BooleanInput,
  date: DateInput,
  datetime: DateInput,
  select: SelectInput,
  multiSelect: SelectInput,
  color: ColorInput,
  link: LinkFieldInput,
  button: ButtonInput,
  openingHours: OpeningHoursInput,
  relation: RelationInput,
  richText: RichTextInput,
  image: MediaInput,
  file: MediaInput,
  videoFile: MediaInput,
  gallery: GalleryInput,
  group: GroupInput,
  list: ListInput,
  blocks: BlocksInput
}

// One lazy component per loader, so a project input loads once and keeps its state across renders.
const lazyInputs = new WeakMap<FieldInputLoaderType, InputType>()

const lazyInput = (loader: FieldInputLoaderType): InputType => {
  const cached = lazyInputs.get(loader)
  if (cached) return cached
  const component = lazy(async () => ({ default: (await loader()).default as InputType }))
  lazyInputs.set(loader, component)
  return component
}

interface Props {
  name: string
  field: DataField
}

// A field's own `component` wins, then the project's input for its kind, then the package's.
const CmsField = ({ name, field }: Props) => {
  const { inputs } = useCms()
  const custom = (field as { component?: FieldInputLoaderType }).component ?? inputs[field.kind]
  const Input = custom ? lazyInput(custom) : BUILTIN_INPUTS[field.kind]

  if (!Input) throw new Error(`[@linkcharsoft/cms] The field kind "${field.kind}" has no panel input: add it to createCmsClient({ inputs }).`)

  const element = <Input name={name} field={field as never} />
  return custom ? <Suspense fallback={<SkeletonBlock className='h-11 rounded-lg' />}>{element}</Suspense> : element
}

export default CmsField
