'use client'
import './ButtonInput.sass'
import { useField } from 'formik'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { useT } from '../../client/context'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { fieldId, useFieldError, useFieldLabel, usePartPath, useText } from '../fieldUtils'
import LinkInput from '../LinkInput/LinkInput'
import type { ButtonField } from '../../../core/kinds/button'

interface Props {
  name: string
  field: ButtonField
}

const ButtonInput = ({ name, field }: Props) => {
  const { t } = useT()
  const text = useText()
  const label = useFieldLabel()
  const labelPath = usePartPath(name, field)('label')
  const [{ value: buttonText, onBlur }, , labelHelpers] = useField<string>(labelPath)
  const [{ value: variant }, , variantHelpers] = useField<string>(`${name}.variant`)
  const labelError = useFieldError(labelPath)
  const id = fieldId(name)

  return (
    <fieldset className='ButtonInput'>
      <legend className='ButtonInput__Legend'>{label(field)}</legend>
      {field.help && <p className='ButtonInput__Help'>{text(field.help)}</p>}

      <div className='ButtonInput__Row'>
        <InputContainer label={t('fields.button.text')} htmlFor={`${id}-label`} error={labelError}>
          <InputText
            id={`${id}-label`}
            value={buttonText ?? ''}
            maxLength={40}
            autoComplete='off'
            invalid={!!labelError}
            onBlur={onBlur}
            name={labelPath}
            onChange={event => labelHelpers.setValue(event.target.value)}
          />
        </InputContainer>

        {field.variants.length > 1 && (
          <InputContainer label={t('fields.button.style')} htmlFor={`${id}-variant`} error={undefined}>
            <Dropdown
              inputId={`${id}-variant`}
              value={variant}
              options={field.variants.map(option => ({ value: option.value, label: text(option.label) }))}
              onChange={event => variantHelpers.setValue(event.value)}
            />
          </InputContainer>
        )}
      </div>

      <LinkInput name={`${name}.link`} label={t('fields.button.target')} />
    </fieldset>
  )
}

export default ButtonInput
