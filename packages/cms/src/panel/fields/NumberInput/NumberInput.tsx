'use client'
import { useField } from 'formik'
import { InputNumber } from 'primereact/inputnumber'
import { useCms } from '../../client/context'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { describedBy, fieldId, useFieldError, useFieldLabel, useText } from '../fieldUtils'
import { useLocaleNote } from '../LocaleNote/LocaleNote'
import type { NumberField } from '../../../core/fields'

interface Props {
  name: string
  field: NumberField
}

const NumberInput = ({ name, field }: Props) => {
  const { config } = useCms()
  const text = useText()
  const label = useFieldLabel()
  const [{ value, onBlur }, , { setValue }] = useField<number | null>(name)
  const error = useFieldError(name)
  const id = fieldId(name)
  const languages = useLocaleNote(name, field)

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)} badge={languages.badge}>
      <InputNumber
        inputId={id}
        name={name}
        value={value}
        min={field.min}
        max={field.max}
        step={field.step}
        useGrouping={false}
        locale={config.panelLocale}
        invalid={!!error}
        aria-describedby={describedBy(name, field)}
        onBlur={onBlur}
        onValueChange={event => setValue(event.value ?? null)}
      />
    </InputContainer>
  )
}

export default NumberInput
