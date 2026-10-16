import './CollectionTabs.sass'
import Link from 'next/link'
import type { CollectionTabType } from '../../shell/navigation'
import type { Route } from 'next'

interface Props {
  tabs: CollectionTabType[]
  activeId: string
  label: string
}

// Links styled as tabs: each collection keeps its own URL, filters and pagination.
const CollectionTabs = ({ tabs, activeId, label }: Props) => (
  <nav className='CollectionTabs' aria-label={label}>
    <ul className='CollectionTabs__List'>
      {tabs.map(tab => (
        <li key={tab.id}>
          <Link
            href={tab.href as Route}
            aria-current={tab.id === activeId ? 'page' : undefined}
            className={['CollectionTabs__Tab', tab.id === activeId && 'CollectionTabs__Tab--Active'].filter(Boolean).join(' ')}
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)

export default CollectionTabs
