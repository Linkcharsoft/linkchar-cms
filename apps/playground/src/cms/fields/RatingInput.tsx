'use client'
import { describedBy, fieldId, InputContainer, useField, useFieldError, useFieldLabel, useText } from '@linkcharsoft/cms/panel'
import type { RatingField } from './rating'
import type { FieldInputPropsType } from '@linkcharsoft/cms/panel'

// The panel input of the project's rating kind, registered in src/cms/client.ts.
const RatingInput = ({ name, field }: FieldInputPropsType<RatingField>) => {
  const text = useText()
  const label = useFieldLabel()
  const [{ value }, , { setValue, setTouched }] = useField<number>(name)
  const error = useFieldError(name)
  const id = fieldId(name)
  const stars = Array.from({ length: field.stars }, (_, index) => index + 1)

  const pick = (star: number) => {
    void setValue(star === value ? 0 : star, false)
    void setTouched(true, true)
  }

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <div id={id} role='radiogroup' aria-label={text(field.label)} aria-describedby={describedBy(name, field)} className='flex gap-1'>
        {stars.map(star => (
          <button
            key={star}
            type='button'
            role='radio'
            aria-checked={star === value}
            aria-label={`${star} / ${field.stars}`}
            className='flex h-11 w-11 items-center justify-center rounded-lg text-xl text-cms-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-cms-primary-ring'
            onClick={() => pick(star)}
          >
            <i className={star <= value ? 'pi pi-star-fill' : 'pi pi-star'} aria-hidden='true' />
          </button>
        ))}
      </div>
    </InputContainer>
  )
}

export default RatingInput
