import { TRANSITIONS } from './shared'
import type { MenuPassThroughOptions } from 'primereact/menu'

const menu: MenuPassThroughOptions = {
  root: { className: 'min-w-[12rem] p-1 bg-cms-surface border border-cms-border rounded-lg shadow-lg' },
  menu: { className: 'm-0 p-0 list-none outline-none' },
  menuitem: { className: 'rounded-md data-[p-focused=true]:bg-cms-primary-50' },
  content: { className: 'rounded-md transition-colors duration-150 hover:bg-cms-neutral-50' },
  action: { className: 'flex items-center gap-2 min-h-[44px] px-3 cms-text-regular-14 text-cms-ink-900 no-underline select-none cursor-pointer' },
  icon: { className: 'text-cms-ink-600' },
  submenuHeader: { className: 'px-3 pt-3 pb-1 cms-text-semibold-12 uppercase tracking-wide text-cms-ink-500' },
  separator: { className: 'my-1 border-t border-cms-border' },
  transition: TRANSITIONS.overlay
}

export default menu
