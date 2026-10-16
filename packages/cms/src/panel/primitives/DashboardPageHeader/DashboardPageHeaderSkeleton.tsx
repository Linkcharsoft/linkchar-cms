import './DashboardPageHeaderSkeleton.sass'
import SkeletonBlock from '../SkeletonBlock/SkeletonBlock'

const DashboardPageHeaderSkeleton = () => (
  <div className='DashboardPageHeaderSkeleton' aria-hidden='true'>
    <div className='DashboardPageHeaderSkeleton__Text'>
      <SkeletonBlock className='DashboardPageHeaderSkeleton__Title' />
      <SkeletonBlock className='DashboardPageHeaderSkeleton__Line' />
    </div>
    <SkeletonBlock className='DashboardPageHeaderSkeleton__Btn' />
  </div>
)

export default DashboardPageHeaderSkeleton
