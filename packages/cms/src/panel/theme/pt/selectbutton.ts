import { classNames } from 'primereact/utils'
import { DISABLED, FOCUS_VISIBLE_RING } from './shared'
import type { SelectButtonPassThroughMethodOptions, SelectButtonPassThroughOptions } from 'primereact/selectbutton'

const selectbutton: SelectButtonPassThroughOptions = {
  root: ({ props }: SelectButtonPassThroughMethodOptions) => ({
    className: classNames('inline-flex p-1 gap-1 rounded-lg bg-cms-primary-50', { [DISABLED]: props.disabled })
  }),
  button: ({ context }: SelectButtonPassThroughMethodOptions) => ({
    className: classNames(
      'inline-flex items-center justify-center gap-2 min-h-[36px] px-3 rounded-md cursor-pointer select-none cms-text-semibold-14 transition-colors duration-200',
      FOCUS_VISIBLE_RING,
      {
        'bg-cms-surface text-cms-primary shadow-sm': context.selected,
        'bg-transparent text-cms-ink-700 hover:text-cms-ink-900': !context.selected,
        [DISABLED]: context.disabled
      }
    )
  }),
  label: { className: '' }
}

export default selectbutton
