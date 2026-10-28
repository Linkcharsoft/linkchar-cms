'use client'
import './ColorInput.sass'
import { useField } from 'formik'
import { InputText } from 'primereact/inputtext'
import { classNames } from 'primereact/utils'
import { isHexColor } from '../../../core/kinds/color'
import { useT } from '../../client/context'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { describedBy, fieldId, useFieldError, useFieldLabel, useText } from '../fieldUtils'
import { useLocaleNote } from '../LocaleNote/LocaleNote'
import type { ColorField } from '../../../core/fields'

interface Props {
  name: string
  field: ColorField
}

const FALLBACK = '#ffffff'

const ColorInput = ({ name, field }: Props) => {
  const { t } = useT()
  const text = useText()
  const label = useFieldLabel()
  const [{ value, onBlur }, , { setValue, setTouched }] = useField<string>(name)
  const error = useFieldError(name)
  const id = fieldId(name)
  const languages = useLocaleNote(name, field)
  const current = value ?? ''
  const title = text(field.label)

  const commit = (next: string) => {
    void setValue(next.toLowerCase(), false)
    void setTouched(true, true)
  }

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)} badge={languages.badge}>
      <div className='ColorInput'>
        <div className='ColorInput__Row'>
          <span className={classNames('ColorInput__Well', { 'ColorInput__Well--Empty': !isHexColor(current) })}>
            <input
              type='color'
              className='ColorInput__Picker'
              aria-label={t('fields.color.pick', { label: title })}
              value={isHexColor(current) ? current : FALLBACK}
              onChange={event => commit(event.target.value)}
            />
          </span>
          <InputText
            id={id}
            name={name}
            className='ColorInput__Text'
            value={current}
            placeholder={t('fields.placeholders.color')}
            maxLength={7}
            autoComplete='off'
            spellCheck={false}
            invalid={!!error}
            aria-invalid={!!error}
            aria-describedby={describedBy(name, field, languages.describedBy)}
            onBlur={onBlur}
            onChange={event => void setValue(event.target.value)}
          />
        </div>
        {field.presets && field.presets.length > 0 && (
          <div className='ColorInput__Presets' role='group' aria-label={t('fields.color.presets', { label: title })}>
            {field.presets.map(preset => (
              <button
                key={preset}
                type='button'
                className='ColorInput__Preset'
                style={{ backgroundColor: preset }}
                aria-label={t('fields.color.preset', { value: preset })}
                aria-pressed={current.toLowerCase() === preset.toLowerCase()}
                onClick={() => commit(preset)}
              />
            ))}
          </div>
        )}
      </div>
    </InputContainer>
  )
}

export default ColorInput
