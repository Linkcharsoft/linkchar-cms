'use client'
import './OpeningHoursInput.sass'
import { useField, useFormikContext } from 'formik'
import { InputMask } from 'primereact/inputmask'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import { weekDayName } from '../../../core/kinds/openingHours'
import { useCms, useT } from '../../client/context'
import InputError from '../../primitives/InputError/InputError'
import { fieldId, useFieldError, useFieldLabel, usePartPath, useText } from '../fieldUtils'
import { SharedBadge, useLocaleNote } from '../LocaleNote/LocaleNote'
import type { DayHoursType, OpeningHoursField } from '../../../core/kinds/openingHours'

interface Props {
  name: string
  field: OpeningHoursField
}

const DayRow = ({ name, index }: { name: string, index: number }) => {
  const { t } = useT()
  const { config } = useCms()
  const path = `${name}.days.${index}`
  const [{ value: day }, , helpers] = useField<DayHoursType>(path)
  const { setFieldTouched } = useFormikContext()
  const fromError = useFieldError(`${path}.from`)
  const toError = useFieldError(`${path}.to`)
  const id = fieldId(path)
  const label = weekDayName(day.day, config.panelLocale)

  // Only the time inputs get touched (on blur): touching the whole day would hide their errors.
  const update = (patch: Partial<DayHoursType>) => void helpers.setValue({ ...day, ...patch }, true)

  return (
    <li className='OpeningHoursInput__Day'>
      <span className='OpeningHoursInput__DayName'>{label}</span>

      <div className='flex items-center gap-2'>
        <InputSwitch inputId={`${id}-open`} checked={!day.closed} onChange={event => update({ closed: !event.value })} />
        <label htmlFor={`${id}-open`} className='OpeningHoursInput__Status'>{t('openingHoursInput.open')}</label>
      </div>

      {!day.closed && (
        <div className='OpeningHoursInput__Times'>
          <InputMask
            id={`${id}-from`}
            mask='99:99'
            slotChar='HH:MM'
            value={day.from}
            autoClear={false}
            aria-label={t('openingHoursInput.from', { day: label })}
            invalid={!!fromError}
            className='OpeningHoursInput__Time'
            onBlur={() => void setFieldTouched(`${path}.from`, true, true)}
            onChange={event => update({ from: event.target.value ?? '' })}
          />
          <span aria-hidden='true'>{t('openingHoursInput.until')}</span>
          <InputMask
            id={`${id}-to`}
            mask='99:99'
            slotChar='HH:MM'
            value={day.to}
            autoClear={false}
            aria-label={t('openingHoursInput.to', { day: label })}
            invalid={!!toError}
            className='OpeningHoursInput__Time'
            onBlur={() => void setFieldTouched(`${path}.to`, true, true)}
            onChange={event => update({ to: event.target.value ?? '' })}
          />
        </div>
      )}

      <div className='OpeningHoursInput__Error'>
        <InputError message={fromError ?? toError} />
      </div>
    </li>
  )
}

const OpeningHoursInput = ({ name, field }: Props) => {
  const { t } = useT()
  const text = useText()
  const label = useFieldLabel()
  const notePath = usePartPath(name, field)('note')
  const [{ value }] = useField<{ days: DayHoursType[] }>(name)
  const [{ value: note, onBlur }, , noteHelpers] = useField<string>(notePath)
  const noteError = useFieldError(notePath)
  const noteId = `${fieldId(name)}-note`
  const languages = useLocaleNote(name, field, 'note')

  return (
    <fieldset className='OpeningHoursInput'>
      <legend className='OpeningHoursInput__Legend'>{label(field)}</legend>
      {field.help && <p className='OpeningHoursInput__Help'>{text(field.help)}</p>}

      <SharedBadge />
      <ul className='OpeningHoursInput__Days'>
        {value.days.map((day, index) => <DayRow key={day.day} name={name} index={index} />)}
      </ul>

      <label htmlFor={noteId} className='OpeningHoursInput__NoteLabel'>{t('openingHoursInput.note')}</label>
      {languages.note}
      <InputText
        id={noteId}
        aria-describedby={languages.describedBy}
        name={notePath}
        value={note ?? ''}
        maxLength={200}
        autoComplete='off'
        placeholder={t('openingHoursInput.notePlaceholder')}
        invalid={!!noteError}
        onBlur={onBlur}
        onChange={event => noteHelpers.setValue(event.target.value)}
      />
      <InputError message={noteError} />
    </fieldset>
  )
}

export default OpeningHoursInput
