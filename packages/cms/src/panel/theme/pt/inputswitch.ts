import { classNames } from 'primereact/utils'
import { DISABLED } from './shared'
import type { InputSwitchPassThroughMethodOptions, InputSwitchPassThroughOptions } from 'primereact/inputswitch'

const inputswitch: InputSwitchPassThroughOptions = {
  root: ({ props }: InputSwitchPassThroughMethodOptions) => ({
    className: classNames(
      'relative inline-block shrink-0 w-11 h-6 rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cms-primary-ring has-[:focus-visible]:ring-offset-2',
      { [DISABLED]: props.disabled }
    )
  }),
  input: { className: 'absolute inset-0 w-full h-full p-0 m-0 opacity-0 z-10 appearance-none cursor-pointer' },
  slider: ({ props }: InputSwitchPassThroughMethodOptions) => ({
    className: classNames(
      'absolute inset-0 rounded-full transition-colors duration-200',
      'before:absolute before:content-[\'\'] before:top-1/2 before:left-[3px] before:-translate-y-1/2 before:w-[18px] before:h-[18px] before:rounded-full before:bg-cms-surface before:shadow-sm before:transition-transform before:duration-200',
      {
        'bg-cms-border-strong hover:bg-cms-ink-400': !props.checked,
        'bg-cms-primary before:translate-x-5': props.checked
      }
    )
  })
}

export default inputswitch
