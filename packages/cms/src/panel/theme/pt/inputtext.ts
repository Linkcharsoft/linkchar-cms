import { classNames } from 'primereact/utils'
import { fieldClasses } from './shared'
import type { InputTextPassThroughMethodOptions, InputTextPassThroughOptions } from 'primereact/inputtext'

const inputtext: InputTextPassThroughOptions = {
  root: ({ props, context }: InputTextPassThroughMethodOptions) => ({
    className: classNames(fieldClasses({ invalid: props.invalid, disabled: context.disabled }))
  })
}

export default inputtext
