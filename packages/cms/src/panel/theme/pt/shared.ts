import { classNames } from 'primereact/utils'

export const DISABLED = 'opacity-60 select-none pointer-events-none cursor-default'

// Focus, one convention (mirrored by the focus-* mixins of theme/mixins.sass and the base rule of styles.css):
// inputs show the ring on any focus, everything else on light grounds on :focus-visible, dark grounds use the accent outline.
export const FOCUS_RING = 'focus:outline-none focus:border-cms-primary focus:ring-2 focus:ring-cms-primary-ring'

export const FOCUS_VISIBLE_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-cms-primary-ring'

export const FOCUS_OUTLINE_DARK = 'focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cms-accent'

export const fieldClasses = ({ invalid, disabled }: { invalid?: boolean, disabled?: boolean }) => classNames(
  'm-0 px-3 py-2.5 cms-text-regular-14 text-cms-ink-900 bg-cms-surface border rounded-lg appearance-none',
  'transition-colors duration-200 placeholder:text-cms-ink-500',
  FOCUS_RING,
  {
    'border-cms-border-strong hover:border-cms-primary': !invalid,
    'border-cms-danger-600 focus:border-cms-danger-600 focus:ring-cms-danger-200': invalid,
    [DISABLED]: disabled
  }
)

export const controlBoxClasses = ({ invalid, disabled, focused }: { invalid?: boolean, disabled?: boolean, focused?: boolean }) => classNames(
  'inline-flex relative cursor-pointer select-none bg-cms-surface border rounded-lg transition-colors duration-200',
  {
    'border-cms-border-strong hover:border-cms-primary': !invalid && !focused,
    'border-cms-primary ring-2 ring-cms-primary-ring': focused && !invalid,
    'border-cms-danger-600': invalid,
    'ring-2 ring-cms-danger-200': invalid && focused,
    [DISABLED]: disabled
  }
)

export const OVERLAY = 'bg-cms-surface text-cms-ink-900 border border-cms-border rounded-lg shadow-lg overflow-hidden'

export const optionClasses = ({ focused, selected, disabled }: { focused?: boolean, selected?: boolean, disabled?: boolean }) => classNames(
  'relative flex items-center gap-2 m-0 px-3 py-2.5 min-h-[40px] cms-text-regular-14 cursor-pointer whitespace-nowrap overflow-hidden transition-colors duration-150',
  {
    'text-cms-ink-900 hover:bg-cms-neutral-50': !focused && !selected,
    'bg-cms-neutral-50 text-cms-ink-900': focused && !selected,
    'bg-cms-primary-50 text-cms-primary font-semibold': selected,
    [DISABLED]: disabled
  }
)

export const ICON_BUTTON = classNames(
  'inline-flex items-center justify-center shrink-0 w-11 h-11 rounded-full border-0 bg-transparent cursor-pointer',
  'text-cms-ink-600 transition-colors duration-200 hover:bg-cms-primary-50 hover:text-cms-ink-900',
  FOCUS_VISIBLE_RING
)

export const CHECK_BOX = 'flex items-center justify-center w-[22px] h-[22px] border-2 rounded-md transition-colors duration-200'

export const TRANSITIONS = {
  overlay: {
    timeout: 150,
    classNames: {
      enter: 'opacity-0 scale-95',
      enterActive: '!opacity-100 !scale-100 transition-[opacity,transform] duration-150 ease-out',
      exit: 'opacity-100',
      exitActive: '!opacity-0 transition-opacity duration-100 ease-linear'
    }
  },
  toggleable: {
    timeout: 300,
    classNames: {
      enter: 'max-h-0',
      enterActive: '!max-h-[2000px] overflow-hidden transition-[max-height] duration-300 ease-in',
      exit: 'max-h-[2000px]',
      exitActive: '!max-h-0 overflow-hidden transition-[max-height] duration-300 ease-out'
    }
  }
}
