'use client'
import { useField } from 'formik'
import { Dropdown } from 'primereact/dropdown'
import { MultiSelect } from 'primereact/multiselect'
import { useT } from '../../client/context'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { describedBy, fieldId, useFieldError, useFieldLabel, useText } from '../fieldUtils'
import type { MultiSelectField, SelectField } from '../../../core/fields'

interface Props {
  name: string
  field: SelectField | MultiSelectField
}

const SelectInput = ({ name, field }: Props) => {
  const { t } = useT()
  const text = useText()
  const label = useFieldLabel()
  const [{ value }, , { setValue, setTouched }] = useField<string | string[] | null>(name)
  const error = useFieldError(name)
  const id = fieldId(name)

  const common = {
    inputId: id,
    name,
    options: field.options.map(option => ({ value: option.value, label: text(option.label) })),
    invalid: !!error,
    'aria-describedby': describedBy(name, field),
    className: 'w-full'
  }

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      {field.kind === 'multiSelect' ? (
        <MultiSelect
          {...common}
          value={Array.isArray(value) ? value : []}
          display='chip'
          placeholder={t('fields.chooseMany')}
          selectionLimit={field.max}
          onChange={event => {
            setValue(event.value ?? [])
            setTouched(true, false)
          }}
        />
      ) : (
        <Dropdown
          {...common}
          value={value}
          placeholder={t('fields.chooseOne')}
          showClear={!field.required}
          onChange={event => {
            setValue(event.value ?? null)
            setTouched(true, false)
          }}
        />
      )}
    </InputContainer>
  )
}

export default SelectInput
