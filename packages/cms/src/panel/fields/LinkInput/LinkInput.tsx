'use client'
import './LinkInput.sass'
import { useField } from 'formik'
import { Dropdown } from 'primereact/dropdown'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import { LINK_KINDS } from '../../../core/kinds/link'
import { useT } from '../../client/context'
import InputError from '../../primitives/InputError/InputError'
import { fieldId, useFieldError } from '../fieldUtils'
import EntryPicker from './EntryPicker'
import type { LinkKindType, LinkValueType } from '../../../core/kinds/link'
import type { ReactNode } from 'react'

interface Props {
  name: string
  label: string
  allow?: readonly LinkKindType[]
  // Next to the legend, e.g. "Same in every language".
  badge?: ReactNode
}

// Groups type + destination + "new tab" under one fieldset; errors point at the destination.
const LinkInput = ({ name, label, allow, badge }: Props) => {
  const { t } = useT()
  const [{ value: link }, , linkHelpers] = useField<LinkValueType>(name)
  const [{ value: type }, , typeHelpers] = useField<LinkKindType>(`${name}.type`)
  const [{ value: href, onBlur }, , hrefHelpers] = useField<string>(`${name}.href`)
  const [{ value: newTab }, , newTabHelpers] = useField<boolean>(`${name}.newTab`)
  const error = [useFieldError(`${name}.href`), useFieldError(`${name}.entry`), useFieldError(`${name}.id`), useFieldError(`${name}.anchor`)].find(Boolean)
  const id = fieldId(name)
  const kinds = LINK_KINDS
    .filter(kind => !allow || allow.includes(kind))
    .map(kind => ({ value: kind, label: t(`fields.link.kinds.${kind}`) }))

  return (
    <fieldset className='LinkInput'>
      <legend className='LinkInput__Legend'>{label}{badge}</legend>

      <div className='LinkInput__Row'>
        <Dropdown
          inputId={`${id}-type`}
          aria-label={t('fields.link.typeOf', { label })}
          value={type}
          options={kinds}
          optionLabel='label'
          optionValue='value'
          className='LinkInput__Type'
          onChange={event => typeHelpers.setValue(event.value)}
        />
        {type === 'entry'
          ? (
            <EntryPicker
              value={link ?? {}}
              label={label}
              inputId={id}
              invalid={!!error}
              onChange={target => linkHelpers.setValue({ ...link, entry: target.entry, id: target.id, anchor: target.anchor })}
            />
          )
          : (
            <InputText
              id={`${id}-href`}
              name={`${name}.href`}
              aria-label={t('fields.link.targetOf', { label })}
              value={href ?? ''}
              placeholder={type ? t(`fields.link.placeholders.${type}`) : undefined}
              autoComplete='off'
              invalid={!!error}
              className='LinkInput__Href'
              onBlur={onBlur}
              onChange={event => hrefHelpers.setValue(event.target.value)}
            />
          )}
      </div>

      <div className='flex items-center gap-3'>
        <InputSwitch
          inputId={`${id}-newtab`}
          checked={!!newTab}
          onChange={event => newTabHelpers.setValue(!!event.value)}
        />
        <label htmlFor={`${id}-newtab`} className='LinkInput__NewTab'>{t('fields.link.newTab')}</label>
      </div>

      <InputError message={error} />
    </fieldset>
  )
}

export default LinkInput
