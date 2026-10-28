import './InputContainer.sass'
import InputError from '../InputError/InputError'
import Label from '../Label/Label'
import type { ReactNode } from 'react'

interface Props {
  label: string
  htmlFor: string
  error: string | undefined
  // Rendered under the label; inputs point to it with aria-describedby={`${htmlFor}-help`}.
  help?: string
  // Right-aligned next to the label, e.g. a character counter.
  aside?: ReactNode
  // Right after the label, e.g. "Same in every language".
  badge?: ReactNode
  // Between the label and the input, e.g. the original text of a translation.
  note?: ReactNode
  children: ReactNode
}

const InputContainer = ({
  label,
  htmlFor,
  error,
  help,
  aside,
  badge,
  note,
  children
}: Props) => {
  const title = badge
    ? <span className='InputContainer__Title'><Label htmlFor={htmlFor}>{label}</Label>{badge}</span>
    : <Label htmlFor={htmlFor}>{label}</Label>

  return (
    <div className='InputContainer' data-tour='field'>
      {aside ? (
        <div className='InputContainer__Header'>
          {title}
          { aside }
        </div>
      ) : title}
      {help && <p id={`${htmlFor}-help`} className='InputContainer__Help'>{help}</p>}
      {note}
      { children }
      <InputError message={error}/>
    </div>
  )
}

export default InputContainer
