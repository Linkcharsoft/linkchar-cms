import { classNames } from 'primereact/utils'
import { ICON_BUTTON } from './shared'
import type { SidebarPassThroughMethodOptions, SidebarPassThroughOptions } from 'primereact/sidebar'

const SLIDE = {
  left: ['-translate-x-full', '!translate-x-0', 'translate-x-0', '!-translate-x-full'],
  right: ['translate-x-full', '!translate-x-0', 'translate-x-0', '!translate-x-full'],
  top: ['-translate-y-full', '!translate-y-0', 'translate-y-0', '!-translate-y-full'],
  bottom: ['translate-y-full', '!translate-y-0', 'translate-y-0', '!translate-y-full']
}

const sidebar: SidebarPassThroughOptions = {
  root: ({ props }: SidebarPassThroughMethodOptions) => ({
    className: classNames('relative flex flex-col pointer-events-auto bg-cms-surface shadow-xl', {
      'h-full w-80': props.position === 'left' || props.position === 'right',
      'w-full h-40': props.position === 'top' || props.position === 'bottom',
      '!w-screen !h-screen': props.fullScreen
    })
  }),
  header: { className: 'flex items-center justify-between gap-4 shrink-0 px-5 pt-5 pb-3 font-cms-display cms-text-bold-20 text-cms-ink-900' },
  icons: { className: 'flex items-center -mr-3 ml-auto' },
  closeButton: { className: ICON_BUTTON },
  closeButtonIcon: { className: 'w-4 h-4' },
  content: { className: 'grow overflow-y-auto px-5 pb-5' },
  mask: { className: 'flex pointer-events-auto bg-cms-overlay transition-colors duration-200' },
  transition: ({ props }: SidebarPassThroughMethodOptions) => {
    const [from, to, idle, leave] = SLIDE[props.position ?? 'left']
    return {
      timeout: 300,
      classNames: {
        enter: from,
        enterActive: `${to} transition-transform duration-300 ease-out`,
        exit: `${idle} transition-transform duration-300 ease-in`,
        exitActive: leave
      }
    }
  }
}

export default sidebar
