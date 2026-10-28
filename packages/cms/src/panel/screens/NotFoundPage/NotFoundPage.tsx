'use client'
import { usePaths, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import EmptyState from '../../primitives/EmptyState/EmptyState'

const NotFoundPage = () => {
  const { t } = useT()
  const paths = usePaths()

  return (
    <main id='main' className='flex-1'>
      <section className='CmsContainer py-6'>
        <EmptyState
          icon='pi pi-compass'
          title={t('shell.notFound.title')}
          description={t('shell.notFound.description')}
          action={<CustomButton href={paths.home} variant='secondary' size='sm'>{t('shell.notFound.home')}</CustomButton>}
        />
      </section>
    </main>
  )
}

export default NotFoundPage
