import './DashboardAuthLayout.sass'
import type { ReactNode } from 'react'

interface Props {
  brand: { name: string, logo?: string }
  tagline: string
  children: ReactNode
}

// Screens render the card as <main className='DashboardAuthLayout__Card'> and share this BEM scope.
const DashboardAuthLayout = ({ brand, tagline, children }: Props) => (
  <div className='DashboardAuthLayout'>
    <div className='DashboardAuthLayout__Brand'>
      {brand.logo
        ? <img src={brand.logo} alt={brand.name} className='DashboardAuthLayout__Logo' />
        : <p className='DashboardAuthLayout__Name'>{brand.name}</p>}
      <p className='DashboardAuthLayout__Tagline'>{tagline}</p>
    </div>

    { children }
  </div>
)

export default DashboardAuthLayout
