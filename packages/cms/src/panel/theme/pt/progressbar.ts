import type { ProgressBarPassThroughOptions } from 'primereact/progressbar'

const progressbar: ProgressBarPassThroughOptions = {
  root: { className: 'relative overflow-hidden h-2 rounded-full bg-cms-primary-100' },
  value: { className: 'absolute inset-y-0 left-0 h-full bg-cms-primary transition-[width] duration-300' },
  label: { className: 'sr-only' }
}

export default progressbar
