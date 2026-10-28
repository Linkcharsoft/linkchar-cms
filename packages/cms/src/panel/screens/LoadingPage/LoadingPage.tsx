'use client'
import './LoadingPage.sass'
import { useT } from '../../client/context'
import DashboardPageHeaderSkeleton from '../../primitives/DashboardPageHeader/DashboardPageHeaderSkeleton'
import SkeletonBlock from '../../primitives/SkeletonBlock/SkeletonBlock'

interface Props {
  // A list screen shows table rows; an editor, labels over inputs and a text area.
  variant?: 'list' | 'editor'
}

const LoadingPage = ({ variant = 'list' }: Props) => {
  const { t } = useT()

  return (
    <main id='main' className='LoadingPage' aria-busy='true'>
      <section className='CmsContainer py-6'>
        <span className='sr-only'>{t('shell.loading')}</span>
        <DashboardPageHeaderSkeleton />
        <div className='LoadingPage__Card' aria-hidden='true'>
          {variant === 'editor'
            ? (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className='LoadingPage__Field'>
                    <SkeletonBlock className='LoadingPage__Label' />
                    <SkeletonBlock className='LoadingPage__Input' />
                  </div>
                ))}
                <div className='LoadingPage__Field'>
                  <SkeletonBlock className='LoadingPage__Label' />
                  <SkeletonBlock className='LoadingPage__Area' />
                </div>
              </>
            )
            : Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className='LoadingPage__Row' />
            ))}
        </div>
      </section>
    </main>
  )
}

export default LoadingPage
