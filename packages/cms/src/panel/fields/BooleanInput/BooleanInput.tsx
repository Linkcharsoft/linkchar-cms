'use client'
import './BooleanInput.sass'
import { useField } from 'formik'
import { InputSwitch } from 'primereact/inputswitch'
import { describedBy, fieldId, useText } from '../fieldUtils'
import type { BooleanField } from '../../../core/fields'

interface Props {
  name: string
  field: BooleanField
}

const BooleanInput = ({ name, field }: Props) => {
  const text = useText()
  const [{ value }, , { setValue, setTouched }] = useField<boolean>(name)
  const id = fieldId(name)

  return (
    <div className='BooleanInput'>
      <InputSwitch
        inputId={id}
        name={name}
        checked={!!value}
        aria-describedby={describedBy(name, field)}
        onChange={event => {
          setValue(!!event.value)
          setTouched(true, false)
        }}
      />
      <div className='flex flex-col'>
        <label htmlFor={id} className='BooleanInput__Label'>{text(field.label)}</label>
        {field.help && <p id={`${id}-help`} className='BooleanInput__Help'>{text(field.help)}</p>}
      </div>
    </div>
  )
}

export default BooleanInput
