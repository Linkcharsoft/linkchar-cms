'use client'
import './TextInput.sass'
import { useField } from 'formik'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { useT } from '../../client/context'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { describedBy, fieldId, useFieldError, useFieldLabel, useText, useValuePath } from '../fieldUtils'
import type { EmailField, PhoneField, TextareaField, TextField, UrlField, VideoField } from '../../../core/fields'

interface Props {
  name: string
  field: TextField | TextareaField | EmailField | PhoneField | UrlField | VideoField
}

const INPUT_TYPES = { text: 'text', email: 'email', phone: 'tel', url: 'url', video: 'url' } as const

const TextInput = ({ name, field }: Props) => {
  const { t } = useT()
  const text = useText()
  const label = useFieldLabel()
  const path = useValuePath(name, field)
  const [{ value, onBlur }, , { setValue }] = useField<string>(path)
  const error = useFieldError(path)
  const id = fieldId(name)
  const placeholders: Partial<Record<Props['field']['kind'], string>> = {
    url: t('fields.placeholders.url'),
    video: t('fields.placeholders.video'),
    phone: t('fields.placeholders.phone')
  }

  const common = {
    id,
    name: path,
    value: value ?? '',
    onBlur,
    invalid: !!error,
    maxLength: field.maxLength,
    placeholder: field.placeholder ? text(field.placeholder) : placeholders[field.kind],
    'aria-describedby': describedBy(name, field),
    className: 'TextInput'
  }

  const counter = field.maxLength
    ? <span className='TextInput__Counter' aria-hidden='true'>{(value ?? '').length}/{field.maxLength}</span>
    : undefined

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)} aside={counter}>
      {field.kind === 'textarea' ? (
        <InputTextarea {...common} rows={field.rows ?? 3} autoResize onChange={event => setValue(event.target.value)} />
      ) : (
        <InputText
          {...common}
          type={INPUT_TYPES[field.kind]}
          autoComplete='off'
          onChange={event => setValue(event.target.value)}
        />
      )}
    </InputContainer>
  )
}

export default TextInput
