import { classNames } from 'primereact/utils'
import { DISABLED, FOCUS_VISIBLE_RING } from './shared'
import type { ButtonPassThroughMethodOptions, ButtonPassThroughOptions } from 'primereact/button'

// CustomButton.sass owns the project's buttons; this only styles the buttons Prime renders internally.
const button: ButtonPassThroughOptions = {
  root: ({ props }: ButtonPassThroughMethodOptions) => ({
    className: classNames(
      'relative inline-flex items-center justify-center gap-2 overflow-hidden select-none cursor-pointer align-bottom text-center transition-colors duration-200',
      FOCUS_VISIBLE_RING,
      { [DISABLED]: props.disabled }
    )
  }),
  label: ({ props }: ButtonPassThroughMethodOptions) => ({
    className: classNames({ 'invisible w-0': !props.label })
  }),
  loadingIcon: { className: 'animate-spin' },
  badge: { className: 'inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full cms-text-semibold-12' }
}

export default button
