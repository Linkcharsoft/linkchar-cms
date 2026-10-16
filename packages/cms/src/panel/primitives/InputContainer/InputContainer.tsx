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
  children: ReactNode
}

const InputContainer = ({
  label,
  htmlFor,
  error,
  help,
  aside,
  children
}: Props) => {
  return (
    <div className="InputContainer">
      {aside ? (
        <div className='InputContainer__Header'>
          <Label htmlFor={htmlFor}>{label}</Label>
          { aside }
        </div>
      ) : (
        <Label htmlFor={htmlFor}>{label}</Label>
      )}
      {help && <p id={`${htmlFor}-help`} className='InputContainer__Help'>{help}</p>}
      { children }
      <InputError message={error}/>
    </div>
  )
}

export default InputContainer
