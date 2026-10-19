'use client'
import './SlugInput.sass'
import { getIn, useField, useFormikContext } from 'formik'
import { InputText } from 'primereact/inputtext'
import { use, useEffect, useState } from 'react'
import { isLocaleMap } from '../../../core/locales'
import slugify, { typingSlug } from '../../../core/slugify'
import { useCms, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { EntryContext } from '../entryContext'
import { describedBy, fieldId, useFieldError, useFieldLabel, useText, useValuePath } from '../fieldUtils'
import type { SlugField } from '../../../core/fields'

interface Props {
  name: string
  field: SlugField
}

// "casa-2" still follows "Casa": the server picks a free variant when another document has the slug.
const followsSource = (value: string, source: string) => value === slugify(source) || new RegExp(`^${slugify(source)}-\\d+$`).test(value)

// Follows the source field (e.g. the title) in the same language until the editor types a slug by hand.
const SlugInput = ({ name, field }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const { locale } = use(EntryContext)
  const text = useText()
  const label = useFieldLabel()
  const path = useValuePath(name, field)
  const { values } = useFormikContext<Record<string, unknown>>()
  const [{ value, onBlur }, , { setValue }] = useField<string>(path)
  const error = useFieldError(path)
  const id = fieldId(name)

  const sourceValue = getIn(values, name.split('.').slice(0, -1).concat(field.from).join('.'))
  const source = String((isLocaleMap(sourceValue, config.locales) ? sourceValue[locale || config.defaultLocale] : sourceValue) ?? '')
  const [isManual, setIsManual] = useState(() => !!value && !followsSource(value, source))

  useEffect(() => {
    if (!isManual && !followsSource(value ?? '', source)) setValue(slugify(source))
  }, [isManual, source, value, setValue])

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <div className='SlugInput'>
        <span className='SlugInput__Prefix' aria-hidden='true'>/</span>
        <InputText
          id={id}
          name={path}
          value={value ?? ''}
          autoComplete='off'
          className='SlugInput__Input'
          invalid={!!error}
          aria-describedby={describedBy(name, field)}
          onBlur={event => {
            setValue(slugify(value ?? ''))
            onBlur(event)
          }}
          onChange={event => {
            setIsManual(true)
            setValue(typingSlug(event.target.value))
          }}
        />
        {isManual && (
          <CustomButton type='button' variant='ghost' size='sm' onClick={() => setIsManual(false)}>
            {t('fields.regenerateSlug')}
          </CustomButton>
        )}
      </div>
    </InputContainer>
  )
}

export default SlugInput
