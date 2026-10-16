'use client'
import './LoadingPage.sass'
import { useT } from '../../client/context'
import DashboardPageHeaderSkeleton from '../../primitives/DashboardPageHeader/DashboardPageHeaderSkeleton'
import SkeletonBlock from '../../primitives/SkeletonBlock/SkeletonBlock'

const LoadingPage = () => {
  const { t } = useT()

  return (
    <main id='main' className='LoadingPage' aria-busy='true'>
      <section className='CmsContainer py-6'>
        <span className='sr-only'>{t('shell.loading')}</span>
        <DashboardPageHeaderSkeleton />
        <div className='LoadingPage__Card' aria-hidden='true'>
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className='LoadingPage__Row' />
          ))}
        </div>
      </section>
    </main>
  )
}

export default LoadingPage
