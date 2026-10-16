import { classNames } from 'primereact/utils'
import { ICON_BUTTON, TRANSITIONS } from './shared'
import type { PanelPassThroughMethodOptions, PanelPassThroughOptions } from 'primereact/panel'

const panel: PanelPassThroughOptions = {
  root: { className: 'bg-cms-surface border border-cms-border rounded-xl' },
  header: ({ props }: PanelPassThroughMethodOptions) => ({
    className: classNames('flex items-center justify-between gap-3', props.toggleable ? 'pl-4 pr-1 py-1' : 'px-4 py-3')
  }),
  title: { className: 'cms-text-semibold-16 text-cms-ink-900' },
  icons: { className: 'flex items-center' },
  toggler: { className: ICON_BUTTON },
  content: { className: 'px-4 pb-4' },
  transition: TRANSITIONS.toggleable
}

export default panel
