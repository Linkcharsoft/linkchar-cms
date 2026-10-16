import type { TabViewPassThroughOptions } from 'primereact/tabview'

const tabview: TabViewPassThroughOptions = {
  navContainer: { className: 'relative' },
  navContent: { className: 'overflow-x-auto overscroll-contain scroll-smooth [&::-webkit-scrollbar]:hidden' },
  nav: { className: 'flex m-0 p-0 list-none border-b border-cms-border' },
  inkbar: { className: 'hidden' },
  panelContainer: { className: 'pt-5' }
}

export default tabview
