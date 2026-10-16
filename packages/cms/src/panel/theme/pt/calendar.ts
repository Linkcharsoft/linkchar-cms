import { classNames } from 'primereact/utils'
import { DISABLED, FOCUS_VISIBLE_RING, TRANSITIONS } from './shared'
import type { CalendarPassThroughMethodOptions, CalendarPassThroughOptions } from 'primereact/calendar'

const NAV_BUTTON = classNames(
  'inline-flex items-center justify-center w-9 h-9 rounded-full border-0 bg-transparent cursor-pointer text-cms-ink-600 transition-colors hover:bg-cms-primary-50 hover:text-cms-ink-900',
  FOCUS_VISIBLE_RING
)

const pickerCell = (selected?: boolean) => classNames(
  'inline-flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors',
  FOCUS_VISIBLE_RING,
  selected ? 'bg-cms-primary text-cms-primary-contrast' : 'text-cms-ink-900 hover:bg-cms-primary-50'
)

const calendar: CalendarPassThroughOptions = {
  root: ({ props }: CalendarPassThroughMethodOptions) => ({
    className: classNames('relative inline-flex max-w-full', { [DISABLED]: props.disabled })
  }),
  input: ({ props }: CalendarPassThroughMethodOptions) => ({
    root: { className: classNames('flex-auto min-w-0', { 'rounded-r-none': props.showIcon }) }
  }),
  dropdownButton: {
    root: classNames(
      'inline-flex items-center justify-center shrink-0 w-11 border border-l-0 border-cms-border-strong rounded-r-lg bg-cms-surface text-cms-primary cursor-pointer hover:bg-cms-neutral-50',
      FOCUS_VISIBLE_RING
    )
  },
  panel: ({ props }: CalendarPassThroughMethodOptions) => ({
    className: classNames('bg-cms-surface text-cms-ink-900 rounded-lg p-3 min-w-[300px]', {
      'absolute top-0 left-0 border border-cms-border shadow-lg': !props.inline,
      'inline-block border border-cms-border': props.inline
    })
  }),
  header: { className: 'flex items-center justify-between pb-2 mb-1 border-b border-cms-border' },
  previousButton: { className: NAV_BUTTON },
  nextButton: { className: NAV_BUTTON },
  title: { className: 'flex items-center gap-1 mx-auto' },
  monthTitle: { className: 'px-1 cms-text-semibold-14 text-cms-ink-900 bg-transparent border-0 cursor-pointer hover:text-cms-primary' },
  yearTitle: { className: 'px-1 cms-text-semibold-14 text-cms-ink-900 bg-transparent border-0 cursor-pointer hover:text-cms-primary' },
  decadeTitle: { className: 'cms-text-semibold-14 text-cms-ink-900' },
  table: { className: 'w-full border-collapse my-1' },
  tableHeaderCell: { className: 'p-1' },
  weekDay: { className: 'cms-text-semibold-12 text-cms-ink-500' },
  day: { className: 'p-0.5' },
  dayLabel: ({ context }: CalendarPassThroughMethodOptions) => ({
    className: classNames(
      'flex items-center justify-center mx-auto w-9 h-9 rounded-full cms-text-regular-14 transition-colors',
      FOCUS_VISIBLE_RING,
      {
        'opacity-40 cursor-default': context.disabled,
        'cursor-pointer': !context.disabled,
        'bg-cms-primary text-cms-primary-contrast': context.selected && !context.disabled,
        'text-cms-ink-900 hover:bg-cms-primary-50': !context.selected && !context.disabled
      }
    )
  }),
  monthPicker: { className: 'my-2 grid grid-cols-3 gap-1' },
  month: ({ context }: CalendarPassThroughMethodOptions) => ({ className: pickerCell(context.selected) }),
  yearPicker: { className: 'my-2 grid grid-cols-2 gap-1' },
  year: ({ context }: CalendarPassThroughMethodOptions) => ({ className: pickerCell(context.selected) }),
  buttonbar: { className: 'flex items-center justify-between pt-2 mt-1 border-t border-cms-border' },
  todayButton: { root: 'min-h-[36px] px-3 rounded-lg cms-text-semibold-14 text-cms-primary bg-transparent hover:bg-cms-primary-50' },
  clearButton: { root: 'min-h-[36px] px-3 rounded-lg cms-text-semibold-14 text-cms-ink-700 bg-transparent hover:bg-cms-primary-50' },
  transition: TRANSITIONS.overlay
}

export default calendar
