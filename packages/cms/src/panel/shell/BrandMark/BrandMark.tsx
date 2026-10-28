import './BrandMark.sass'

interface Props {
  tag?: string
  size?: 'small' | 'medium'
}

// A name, not a text: it reads the same in every panel language.
const BRAND_NAME = 'Inferencia'

const SIZE_CLASSES = { small: 'BrandMark BrandMark--Small', medium: 'BrandMark BrandMark--Medium' }

const BrandMark = ({ tag, size = 'small' }: Props) => (
  <span className={SIZE_CLASSES[size]}>
    <svg viewBox='0 0 107 107' fill='currentColor' aria-hidden='true' focusable='false' className='BrandMark__Star'>
      <path d='M 107 53.497 C 73.796 42.292 64.712 33.209 53.5 0 C 42.295 33.209 33.211 42.292 0 53.497 C 33.211 64.708 42.295 73.791 53.5 107 C 64.712 73.791 73.796 64.708 107 53.497 Z' />
    </svg>
    <span className='BrandMark__Name'>{BRAND_NAME}</span>
    {tag && <span className='BrandMark__Tag'>{tag}</span>}
  </span>
)

export default BrandMark
