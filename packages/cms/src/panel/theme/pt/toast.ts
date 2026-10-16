import { classNames } from 'primereact/utils'
import { ICON_BUTTON } from './shared'
import type { ToastPassThroughMethodOptions, ToastPassThroughOptions } from 'primereact/toast'

const SEVERITY_ACCENT = {
  success: 'border-l-cms-success-600 [&_.pi]:text-cms-success-600',
  info: 'border-l-cms-primary [&_.pi]:text-cms-primary',
  warn: 'border-l-cms-warning-500 [&_.pi]:text-cms-warning-700',
  error: 'border-l-cms-danger-600 [&_.pi]:text-cms-danger-600',
  secondary: 'border-l-cms-ink-500',
  contrast: 'border-l-cms-ink-900'
}

const toast: ToastPassThroughOptions = {
  root: { className: 'w-[min(400px,calc(100vw-32px))]' },
  message: ({ state, index }: ToastPassThroughMethodOptions & { index: number }) => ({
    className: classNames(
      'mb-3 w-full overflow-hidden bg-cms-surface border border-cms-border border-l-4 rounded-xl shadow-lg',
      SEVERITY_ACCENT[(state.messages[index]?.message.severity ?? 'info') as keyof typeof SEVERITY_ACCENT]
    )
  }),
  content: { className: 'flex items-start gap-3 p-4' },
  icon: { className: 'shrink-0' },
  text: { className: 'flex flex-col flex-1 gap-0.5 min-w-0' },
  summary: { className: 'cms-text-semibold-14 text-cms-ink-900' },
  detail: { className: 'cms-text-regular-14 text-cms-ink-700' },
  closeButton: { className: classNames(ICON_BUTTON, '-m-2') },
  closeButtonIcon: { className: 'w-3.5 h-3.5' },
  transition: {
    timeout: { enter: 250, exit: 300 },
    classNames: {
      enter: 'opacity-0 translate-x-4',
      enterActive: '!opacity-100 !translate-x-0 transition-[opacity,transform] duration-200 ease-out',
      exit: 'max-h-40 opacity-100',
      exitActive: '!max-h-0 !opacity-0 !mb-0 overflow-hidden transition-all duration-300 ease-in'
    }
  }
}

export default toast
