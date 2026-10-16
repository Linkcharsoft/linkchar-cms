import { fieldClasses } from './shared'
import type { InputTextareaPassThroughMethodOptions, InputTextareaPassThroughOptions } from 'primereact/inputtextarea'

const inputtextarea: InputTextareaPassThroughOptions = {
  root: ({ props, context }: InputTextareaPassThroughMethodOptions) => ({
    className: fieldClasses({ invalid: props.invalid, disabled: context.disabled })
  })
}

export default inputtextarea
