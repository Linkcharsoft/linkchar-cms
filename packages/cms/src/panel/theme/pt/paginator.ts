import { classNames } from 'primereact/utils'
import { FOCUS_VISIBLE_RING } from './shared'
import type { PaginatorPassThroughMethodOptions, PaginatorPassThroughOptions } from 'primereact/paginator'

const pageButton = (disabled?: boolean, active?: boolean) => classNames(
  'relative inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg border-0 cms-text-regular-14 leading-none select-none transition-colors duration-200',
  FOCUS_VISIBLE_RING,
  {
    'opacity-40 cursor-default pointer-events-none': disabled,
    'bg-cms-primary text-cms-primary-contrast font-semibold': active,
    'bg-transparent text-cms-ink-700 cursor-pointer hover:bg-cms-primary-50 hover:text-cms-ink-900': !active && !disabled
  }
)

const navButton = ({ context }: PaginatorPassThroughMethodOptions) => ({ className: pageButton(context.disabled) })

const paginator: PaginatorPassThroughOptions = {
  root: { className: 'flex flex-wrap items-center justify-center gap-1 px-4 py-3' },
  firstPageButton: navButton,
  prevPageButton: navButton,
  nextPageButton: navButton,
  lastPageButton: navButton,
  pages: { className: 'flex items-center gap-1' },
  pageButton: ({ context }: PaginatorPassThroughMethodOptions) => ({ className: pageButton(false, context.active) }),
  current: { className: 'px-2 cms-text-regular-14 text-cms-ink-600' }
}

export default paginator
