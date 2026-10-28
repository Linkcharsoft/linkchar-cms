'use client'
import './BooleanInput.sass'
import { useField } from 'formik'
import { InputSwitch } from 'primereact/inputswitch'
import InputError from '../../primitives/InputError/InputError'
import { describedBy, errorId, fieldId, useFieldError, useFieldLabel, useText } from '../fieldUtils'
import { useLocaleNote } from '../LocaleNote/LocaleNote'
import type { BooleanField } from '../../../core/fields'

interface Props {
  name: string
  field: BooleanField
}

const BooleanInput = ({ name, field }: Props) => {
  const text = useText()
  const label = useFieldLabel()
  const [{ value }, , { setValue, setTouched }] = useField<boolean>(name)
  const error = useFieldError(name)
  const id = fieldId(name)
  const languages = useLocaleNote(name, field)

  return (
    <div className='BooleanInput'>
      <div className='BooleanInput__Row'>
        <InputSwitch
          inputId={id}
          name={name}
          checked={!!value}
          invalid={!!error}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, field, error && errorId(name))}
          onChange={event => {
            setValue(!!event.value, true)
            setTouched(true, false)
          }}
        />
        <div className='flex flex-col'>
          <span className='BooleanInput__Title'>
            <label htmlFor={id} className='BooleanInput__Label'>{label(field)}</label>
            {languages.badge}
          </span>
          {field.help && <p id={`${id}-help`} className='BooleanInput__Help'>{text(field.help)}</p>}
        </div>
      </div>
      <InputError id={errorId(name)} message={error} />
    </div>
  )
}

export default BooleanInput
