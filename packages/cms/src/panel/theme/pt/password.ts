import { classNames } from 'primereact/utils'
import { DISABLED, TRANSITIONS } from './shared'
import type { PasswordPassThroughMethodOptions, PasswordPassThroughOptions } from 'primereact/password'

const TOGGLE_ICON = 'absolute top-1/2 right-3 -translate-y-1/2 text-cms-ink-600 cursor-pointer'

const password: PasswordPassThroughOptions = {
  root: ({ props }: PasswordPassThroughMethodOptions) => ({
    className: classNames('relative inline-flex w-full', { [DISABLED]: props.disabled })
  }),
  iconField: { root: 'relative w-full' },
  input: { root: 'w-full pr-10' },
  showIcon: { className: TOGGLE_ICON },
  hideIcon: { className: TOGGLE_ICON },
  panel: { className: 'p-4 bg-cms-surface border border-cms-border rounded-lg shadow-lg cms-text-regular-14 text-cms-ink-900' },
  meter: { className: 'mb-2 h-2 rounded-full bg-cms-primary-100 overflow-hidden' },
  meterLabel: ({ state }: PasswordPassThroughMethodOptions) => ({
    className: classNames('h-full transition-[width] duration-500', {
      'bg-cms-danger-600': state.meter?.strength === 'weak',
      'bg-cms-warning-500': state.meter?.strength === 'medium',
      'bg-cms-success-600': state.meter?.strength === 'strong'
    })
  }),
  transition: TRANSITIONS.overlay
}

export default password
