import { classNames } from 'primereact/utils'
import { CHECK_BOX } from './shared'
import type { CheckboxPassThroughMethodOptions, CheckboxPassThroughOptions } from 'primereact/checkbox'

const checkbox: CheckboxPassThroughOptions = {
  root: ({ props }: CheckboxPassThroughMethodOptions) => ({
    className: classNames(
      'relative inline-flex shrink-0 align-bottom select-none cursor-pointer w-[22px] h-[22px] rounded-md',
      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cms-primary-ring has-[:focus-visible]:ring-offset-2',
      { 'opacity-60 cursor-default': props.disabled }
    )
  }),
  input: { className: 'absolute inset-0 w-full h-full p-0 m-0 opacity-0 z-10 appearance-none cursor-pointer' },
  box: ({ props, context }: CheckboxPassThroughMethodOptions) => ({
    className: classNames(CHECK_BOX, {
      'border-cms-border-strong bg-cms-surface hover:border-cms-primary': !context.checked && !props.invalid,
      'border-cms-primary bg-cms-primary': context.checked,
      'border-cms-danger-600 bg-cms-surface': props.invalid && !context.checked
    })
  }),
  icon: { className: 'w-3.5 h-3.5 text-cms-primary-contrast' }
}

export default checkbox
