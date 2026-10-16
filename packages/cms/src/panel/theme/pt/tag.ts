import { classNames } from 'primereact/utils'
import type { TagPassThroughMethodOptions, TagPassThroughOptions } from 'primereact/tag'

// Soft tones keep AA contrast for 12px text; the solid -500 fills of the preset don't.
const TONES = {
  success: 'bg-cms-success-50 text-cms-success-800 border-cms-success-200',
  info: 'bg-cms-primary-50 text-cms-primary border-cms-primary-100',
  warning: 'bg-cms-warning-50 text-cms-warning-800 border-cms-warning-200',
  danger: 'bg-cms-danger-50 text-cms-danger-700 border-cms-danger-200',
  secondary: 'bg-cms-neutral-50 text-cms-ink-700 border-cms-border-strong',
  contrast: 'bg-cms-primary-100 text-cms-ink-900 border-cms-border-strong'
}

const tag: TagPassThroughOptions = {
  root: ({ props }: TagPassThroughMethodOptions) => ({
    className: classNames(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border cms-text-semibold-12 leading-5 whitespace-nowrap',
      TONES[props.severity ?? 'info']
    )
  }),
  icon: { className: 'text-[12px]' },
  value: { className: 'leading-5' }
}

export default tag
