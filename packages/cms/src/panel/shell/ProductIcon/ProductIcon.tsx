import './ProductIcon.sass'
import { initials } from '../../primitives/UserAvatar/initials'

interface Props {
  name: string
  icon?: string
  size?: 'medium' | 'large'
}

const SIZE_CLASSES = { medium: 'ProductIcon ProductIcon--Medium', large: 'ProductIcon ProductIcon--Large' }

// Decorative: the product name always sits next to it.
const ProductIcon = ({ name, icon, size = 'medium' }: Props) => (
  <span className={SIZE_CLASSES[size]} aria-hidden='true'>
    {icon ? <img src={icon} alt='' className='ProductIcon__Image' /> : initials(name)}
  </span>
)

export default ProductIcon
