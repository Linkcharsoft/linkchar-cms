import { classNames } from 'primereact/utils'
import { DISABLED, OVERLAY, optionClasses, TRANSITIONS } from './shared'
import type { AutoCompletePassThroughMethodOptions, AutoCompletePassThroughOptions } from 'primereact/autocomplete'

const BESIDE_BUTTON = '[&:not(:last-child)]:rounded-r-none'

const autocomplete: AutoCompletePassThroughOptions = {
  root: ({ props }: AutoCompletePassThroughMethodOptions) => ({
    className: classNames('relative inline-flex w-full', { [DISABLED]: props.disabled })
  }),
  input: { root: { className: classNames('w-full', BESIDE_BUTTON) } },
  container: {
    className: classNames(
      'flex flex-wrap items-center gap-1.5 w-full min-h-[44px] m-0 px-2 py-1.5 list-none bg-cms-surface border border-cms-border-strong rounded-lg cursor-text transition-colors',
      'hover:border-cms-primary focus-within:border-cms-primary focus-within:ring-2 focus-within:ring-cms-primary-ring',
      '[&_input]:border-0 [&_input]:p-1 [&_input]:bg-transparent [&_input]:outline-none [&_input]:ring-0',
      BESIDE_BUTTON
    )
  },
  inputToken: { className: 'inline-flex flex-1 min-w-[8rem]' },
  token: { className: 'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cms-primary-50 cms-text-regular-12 text-cms-ink-900' },
  removeTokenIcon: { className: 'w-3 h-3 cursor-pointer text-cms-ink-600 hover:text-cms-ink-900' },
  loadingIcon: { className: 'absolute top-1/2 right-14 -mt-[7px] w-[14px] h-[14px] animate-spin text-cms-ink-500' },
  dropdownButton: {
    root: { className: 'shrink-0 w-11 border border-l-0 border-cms-border-strong rounded-l-none rounded-r-lg bg-cms-surface text-cms-ink-600 hover:bg-cms-neutral-50' }
  },
  panel: { className: classNames(OVERLAY, 'max-h-[260px] overflow-auto') },
  list: { className: 'm-0 py-1 list-none' },
  item: ({ context }: AutoCompletePassThroughMethodOptions) => ({
    className: classNames(
      optionClasses({ selected: context.selected, disabled: context.disabled }),
      'data-[p-highlight=true]:bg-cms-neutral-50'
    )
  }),
  itemGroup: { className: 'm-0 px-3 pt-3 pb-1 cms-text-semibold-12 uppercase tracking-wide text-cms-ink-500 cursor-auto' },
  emptyMessage: { className: 'px-3 py-2.5 cms-text-regular-14 text-cms-ink-600' },
  transition: TRANSITIONS.overlay
}

export default autocomplete
