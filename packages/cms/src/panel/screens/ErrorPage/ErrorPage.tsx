'use client'
import { useEffect } from 'react'
import { usePaths, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import EmptyState from '../../primitives/EmptyState/EmptyState'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

// Next's error boundary for the panel screens; the layout and its navigation stay around it.
const ErrorPage = ({ error, reset }: Props) => {
  const { t } = useT()
  const paths = usePaths()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id='main' className='flex-1'>
      <section className='CmsContainer py-6'>
        <EmptyState
          icon='pi pi-exclamation-circle'
          title={t('shell.error.title')}
          description={error.digest ? `${t('shell.error.description')} ${t('shell.error.reference', { digest: error.digest })}` : t('shell.error.description')}
          action={(
            <>
              <CustomButton type='button' size='sm' onClick={reset}>{t('shell.error.retry')}</CustomButton>
              <CustomButton href={paths.home} variant='secondary' size='sm'>{t('shell.error.home')}</CustomButton>
            </>
          )}
        />
      </section>
    </main>
  )
}

export default ErrorPage
