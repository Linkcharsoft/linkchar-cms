'use client'
import { useField } from 'formik'
import { Calendar } from 'primereact/calendar'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { describedBy, fieldId, useFieldError, useFieldLabel, useText } from '../fieldUtils'
import type { DateField, DatetimeField } from '../../../core/fields'

interface Props {
  name: string
  field: DateField | DatetimeField
}

const pad = (value: number) => String(value).padStart(2, '0')

// Dates are stored as YYYY-MM-DD (no timezone shift); datetimes as full ISO strings.
const toStored = (date: Date | null | undefined, withTime: boolean) => {
  if (!date) return null
  return withTime ? date.toISOString() : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const toDate = (value: string | null) => {
  if (!value) return null
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value)
}

const DateInput = ({ name, field }: Props) => {
  const text = useText()
  const label = useFieldLabel()
  const [{ value }, , { setValue, setTouched }] = useField<string | null>(name)
  const error = useFieldError(name)
  const id = fieldId(name)
  const withTime = field.kind === 'datetime'

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <Calendar
        inputId={id}
        name={name}
        value={toDate(value)}
        showTime={withTime}
        hourFormat='24'
        showIcon
        showButtonBar
        invalid={!!error}
        aria-describedby={describedBy(name, field)}
        onChange={event => {
          setValue(toStored(event.value, withTime))
          setTouched(true, false)
        }}
      />
    </InputContainer>
  )
}

export default DateInput
