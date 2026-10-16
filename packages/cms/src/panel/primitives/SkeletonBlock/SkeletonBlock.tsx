import './SkeletonBlock.sass'

interface Props {
  className?: string
}

const SkeletonBlock = ({ className }: Props) => (
  <div className={['SkeletonBlock', className].filter(Boolean).join(' ')} />
)

export default SkeletonBlock
