'use client'
import { describedBy, fieldId, InputContainer, useField, useFieldError, useFieldLabel, useText } from '@linkcharsoft/cms/panel'
import type { ColorField } from './color'
import type { FieldInputPropsType } from '@linkcharsoft/cms/panel'

// The panel input of the project's color kind, registered in src/cms/client.ts.
const ColorInput = ({ name, field }: FieldInputPropsType<ColorField>) => {
  const text = useText()
  const label = useFieldLabel()
  const [{ value, onBlur }, , { setValue }] = useField<string>(name)
  const error = useFieldError(name)
  const id = fieldId(name)

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <div className='flex items-center gap-3'>
        <input
          type='color'
          aria-label={label(field)}
          className='h-11 w-14 cursor-pointer rounded-lg border border-cms-border-strong bg-cms-surface'
          value={value || '#000000'}
          onChange={event => setValue(event.target.value)}
        />
        <input
          id={id}
          name={name}
          value={value ?? ''}
          placeholder='#1f5fa8'
          autoComplete='off'
          aria-describedby={describedBy(name, field)}
          className='h-11 flex-1 rounded-lg border border-cms-border-strong px-3 cms-text-regular-14'
          onBlur={onBlur}
          onChange={event => setValue(event.target.value)}
        />
      </div>
    </InputContainer>
  )
}

export default ColorInput
