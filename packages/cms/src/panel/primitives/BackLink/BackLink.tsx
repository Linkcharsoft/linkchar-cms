import './BackLink.sass'
import Link from 'next/link'
import type { Route } from 'next'

interface Props {
  href: string
  label: string
}

const BackLink = ({ href, label }: Props) => (
  <Link href={href as Route} className='BackLink'>
    <i className='pi pi-arrow-left' aria-hidden='true' />
    {label}
  </Link>
)

export default BackLink
