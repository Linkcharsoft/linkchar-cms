import { classNames } from 'primereact/utils'
import { controlBoxClasses, fieldClasses, ICON_BUTTON, OVERLAY, optionClasses, TRANSITIONS } from './shared'
import type { MultiSelectPassThroughMethodOptions, MultiSelectPassThroughOptions } from 'primereact/multiselect'

type ItemOptions = MultiSelectPassThroughMethodOptions & { context: { focused?: boolean, disabled?: boolean } }

const multiselect: MultiSelectPassThroughOptions = {
  root: ({ props, state }: MultiSelectPassThroughMethodOptions) => ({
    className: controlBoxClasses({ invalid: props.invalid, disabled: props.disabled, focused: state.focused || state.overlayVisible })
  }),
  labelContainer: { className: 'flex flex-auto min-w-0 overflow-hidden cursor-pointer' },
  label: ({ props }: MultiSelectPassThroughMethodOptions) => ({
    className: classNames(
      'block overflow-hidden text-ellipsis whitespace-nowrap cms-text-regular-14 cursor-pointer',
      Array.isArray(props.value) && props.value.length ? 'text-cms-ink-900' : 'text-cms-ink-500',
      props.display === 'chip' && Array.isArray(props.value) && props.value.length ? 'flex flex-wrap gap-1 px-2 py-1.5' : 'px-3 py-2.5'
    )
  }),
  token: { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cms-primary-50 cms-text-regular-12 text-cms-ink-900 cursor-default' },
  removeTokenIcon: { className: 'w-3 h-3 cursor-pointer' },
  trigger: { className: 'flex items-center justify-center shrink-0 w-10 text-cms-ink-600' },
  panel: { className: OVERLAY },
  header: { className: 'flex items-center gap-2 p-2 border-b border-cms-border' },
  headerCheckboxContainer: { className: 'relative inline-flex shrink-0' },
  filterContainer: { className: 'relative flex-auto' },
  filterInput: { root: { className: classNames(fieldClasses({}), 'w-full pr-9') } },
  filterIcon: { className: 'absolute top-1/2 right-3 -translate-y-1/2 text-cms-ink-500' },
  closeButton: { className: classNames(ICON_BUTTON, 'w-9 h-9') },
  wrapper: { className: 'overflow-auto' },
  list: { className: 'm-0 py-1 list-none' },
  item: ({ context }: ItemOptions) => ({
    className: optionClasses({ focused: context.focused, disabled: context.disabled })
  }),
  checkboxContainer: { className: 'relative inline-flex shrink-0' },
  itemGroup: { className: 'm-0 px-3 pt-3 pb-1 cms-text-semibold-12 uppercase tracking-wide text-cms-ink-500 cursor-auto' },
  emptyMessage: { className: 'px-3 py-2.5 cms-text-regular-14 text-cms-ink-600' },
  transition: TRANSITIONS.overlay
}

export default multiselect
