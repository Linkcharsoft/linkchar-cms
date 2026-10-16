import type { TooltipPassThroughOptions } from 'primereact/tooltip'

const tooltip: TooltipPassThroughOptions = {
  root: { className: 'absolute z-[1100] max-w-xs px-1 py-1 pointer-events-none' },
  text: { className: 'px-2.5 py-1.5 rounded-md shadow-md bg-cms-ink-900 text-white cms-text-regular-12 whitespace-pre-line' },
  arrow: { className: 'hidden' }
}

export default tooltip
