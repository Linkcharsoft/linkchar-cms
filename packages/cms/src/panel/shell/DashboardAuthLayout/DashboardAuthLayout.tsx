import './DashboardAuthLayout.sass'
import BrandMark from '../BrandMark/BrandMark'
import ProductIcon from '../ProductIcon/ProductIcon'
import type { ReactNode } from 'react'

interface Props {
  brand: { name: string, icon?: string }
  tagline: string
  brandTag: string
  children: ReactNode
}

// Screens render the card as <main className='DashboardAuthLayout__Card'> and share this BEM scope.
const DashboardAuthLayout = ({ brand, tagline, brandTag, children }: Props) => (
  <div className='DashboardAuthLayout'>
    <div className='DashboardAuthLayout__Brand'>
      <ProductIcon name={brand.name} icon={brand.icon} size='large' />
      <p className='DashboardAuthLayout__Name'>{brand.name}</p>
      <p className='DashboardAuthLayout__Tagline'>{tagline}</p>
    </div>

    { children }

    <BrandMark tag={brandTag} size='medium' />
  </div>
)

export default DashboardAuthLayout
