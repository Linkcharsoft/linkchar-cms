import { classNames } from 'primereact/utils'
import { controlBoxClasses, fieldClasses, OVERLAY, optionClasses, TRANSITIONS } from './shared'
import type { DropdownPassThroughMethodOptions, DropdownPassThroughOptions } from 'primereact/dropdown'

const dropdown: DropdownPassThroughOptions = {
  root: ({ props, state }: DropdownPassThroughMethodOptions) => ({
    className: controlBoxClasses({ invalid: props.invalid, disabled: props.disabled, focused: state.focused || state.overlayVisible })
  }),
  input: ({ props }: DropdownPassThroughMethodOptions) => ({
    className: classNames(
      'flex-auto block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2.5 cms-text-regular-14 bg-transparent border-0 outline-none cursor-pointer',
      props.value === null || props.value === undefined || props.value === '' ? 'text-cms-ink-500' : 'text-cms-ink-900',
      { 'pr-8': props.showClear }
    )
  }),
  // Keyboard and screen readers use the hidden input; the trigger and the native select only repeat it.
  trigger: { className: 'flex items-center justify-center shrink-0 w-10 text-cms-ink-600', 'aria-hidden': true },
  select: { 'aria-hidden': true },
  clearIcon: { className: 'absolute top-1/2 right-11 -translate-y-1/2 text-cms-ink-500 cursor-pointer' },
  panel: { className: OVERLAY },
  header: { className: 'p-2 border-b border-cms-border' },
  filterContainer: { className: 'relative' },
  filterInput: { root: { className: classNames(fieldClasses({}), 'w-full pr-9') } },
  filterIcon: { className: 'absolute top-1/2 right-3 -translate-y-1/2 text-cms-ink-500' },
  wrapper: { className: 'overflow-auto' },
  list: { className: 'm-0 py-1 list-none' },
  item: ({ context }: DropdownPassThroughMethodOptions) => ({
    className: optionClasses({ focused: context.focused, selected: context.selected, disabled: context.disabled })
  }),
  itemGroup: { className: 'm-0 px-3 pt-3 pb-1 cms-text-semibold-12 uppercase tracking-wide text-cms-ink-500 cursor-auto' },
  emptyMessage: { className: 'px-3 py-2.5 cms-text-regular-14 text-cms-ink-600' },
  transition: TRANSITIONS.overlay
}

export default dropdown
