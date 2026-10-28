'use client'
import './UserAvatar.sass'
import Image from 'next/image'
import { mediaPublicUrl } from '../../../core/media'
import { useCms } from '../../client/context'
import { initials } from './initials'

const SIZE_CLASSES = { small: 'UserAvatar UserAvatar--Small', large: 'UserAvatar UserAvatar--Large' }

interface Props {
  name: string
  avatar: string | null
  size?: 'small' | 'large'
}

const UserAvatar = ({ name, avatar, size = 'small' }: Props) => {
  const { supabase } = useCms()

  return (
    <span className={SIZE_CLASSES[size]} aria-hidden='true'>
      {avatar
        ? <Image src={mediaPublicUrl(supabase.url, avatar)} alt='' fill sizes={size === 'small' ? '36px' : '88px'} className='UserAvatar__Image' />
        : initials(name)}
    </span>
  )
}

export default UserAvatar
