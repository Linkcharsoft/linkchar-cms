import { classNames } from 'primereact/utils'
import { ICON_BUTTON } from './shared'
import type { DialogPassThroughMethodOptions, DialogPassThroughOptions } from 'primereact/dialog'

const dialog: DialogPassThroughOptions = {
  root: ({ state }: DialogPassThroughMethodOptions) => ({
    className: classNames(
      'flex flex-col max-h-[90%] w-[min(640px,calc(100vw-32px))] m-0 bg-cms-surface rounded-2xl shadow-xl border-0',
      { '!w-screen !h-screen !max-h-full !top-0 !left-0 rounded-none': state.maximized }
    )
  }),
  header: { className: 'flex items-center justify-between gap-4 shrink-0 px-6 pt-5 pb-3 rounded-t-2xl' },
  headerTitle: { className: 'm-0 font-cms-display cms-text-bold-20 text-cms-ink-900' },
  headerIcons: { className: 'flex items-center -mr-3' },
  closeButton: { className: ICON_BUTTON },
  closeButtonIcon: { className: 'w-4 h-4' },
  content: ({ props }: DialogPassThroughMethodOptions) => ({
    className: classNames('flex-1 min-h-0 overflow-y-auto px-6 pb-6 cms-text-regular-14 text-cms-ink-900', { 'rounded-b-2xl': !props.footer })
  }),
  footer: { className: 'flex flex-wrap items-center justify-end gap-2 shrink-0 px-6 pt-2 pb-5 rounded-b-2xl' },
  mask: ({ state }: DialogPassThroughMethodOptions) => ({
    className: classNames('p-4 transition-colors duration-200', { 'bg-cms-overlay': state.containerVisible })
  }),
  transition: {
    timeout: 200,
    classNames: {
      enter: 'opacity-0 scale-95',
      enterActive: '!opacity-100 !scale-100 transition-[opacity,transform] duration-200 ease-out',
      exit: 'opacity-100 scale-100',
      exitActive: '!opacity-0 !scale-95 transition-[opacity,transform] duration-150 ease-in'
    }
  }
}

export default dialog
