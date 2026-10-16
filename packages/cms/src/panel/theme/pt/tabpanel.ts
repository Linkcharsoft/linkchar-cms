import { classNames } from 'primereact/utils'
import { DISABLED } from './shared'
import type { TabPanelPassThroughMethodOptions, TabPanelPassThroughOptions } from 'primereact/tabview'

type TabOptions = TabPanelPassThroughMethodOptions & { context?: { active?: boolean, disabled?: boolean } }

// TabView resolves these sections twice (as `tab.*` and `tabpanel.*`); only one call carries the context.
const tabpanel: TabPanelPassThroughOptions = {
  header: ({ context }: TabOptions) => (context
    ? { className: classNames('mr-0', { [DISABLED]: context.disabled }) }
    : {}),
  headerAction: ({ context }: TabOptions) => (context
    ? {
      className: classNames(
        'relative flex items-center gap-2 min-h-[44px] px-4 -mb-px border-b-2 cursor-pointer select-none no-underline whitespace-nowrap cms-text-semibold-14 transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cms-primary-ring',
        context.active
          ? 'border-cms-primary text-cms-primary'
          : 'border-transparent text-cms-ink-600 hover:text-cms-ink-900 hover:border-cms-border-strong'
      )
    }
    : {}),
  headerTitle: { className: 'leading-none' }
}

export default tabpanel
