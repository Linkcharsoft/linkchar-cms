import './DialogFooter.sass'
import type { ReactNode } from 'react'

interface Props {
  start?: ReactNode
  children: ReactNode
}

const DialogFooter = ({ start, children }: Props) => (
  <div className='DialogFooter'>
    {start && <div className='DialogFooter__Start'>{start}</div>}
    <div className='DialogFooter__End'>{children}</div>
  </div>
)

export default DialogFooter
