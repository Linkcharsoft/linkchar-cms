import { classNames } from 'primereact/utils'
import type { DataTableBodyRowContext, DataTablePassThroughOptions } from 'primereact/datatable'

const datatable: DataTablePassThroughOptions = {
  root: { className: 'relative' },
  loadingOverlay: { className: 'absolute inset-0 z-[2] flex items-center justify-center bg-cms-veil' },
  loadingIcon: { className: 'w-8 h-8 animate-spin text-cms-primary' },
  table: { className: 'w-full border-collapse' },
  thead: { className: 'bg-cms-neutral-50' },
  bodyRow: ({ context }: { context: DataTableBodyRowContext }) => ({
    className: classNames('bg-cms-surface transition-colors duration-150', {
      'cursor-pointer hover:bg-cms-neutral-50': context.selectable,
      'bg-cms-primary-50': context.selected
    })
  }),
  emptyMessage: { className: 'bg-cms-surface' },
  column: {
    headerCell: { className: 'px-4 py-3 text-left align-middle border-b border-cms-border bg-cms-neutral-50 cms-text-semibold-14 text-cms-ink-600' },
    headerContent: { className: 'flex items-center gap-2' },
    bodyCell: { className: 'px-4 py-3 text-left align-middle border-b border-cms-border cms-text-regular-14 text-cms-ink-900' },
    columnTitle: { className: 'hidden' },
    rowReorderIcon: { className: 'cursor-move text-cms-ink-500' }
  }
}

export default datatable
