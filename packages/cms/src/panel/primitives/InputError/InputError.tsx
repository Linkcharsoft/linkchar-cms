'use client'
import { AnimatePresence, m } from 'motion/react'

interface Props {
  message: string | undefined
}

const InputError = ({ message }: Props) => {
  return (
    <AnimatePresence>
      {message && (
        <m.div
          role='alert'
          className='InputError cms-text-medium-14 flex items-center gap-2 text-cms-danger-600'
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <i className='pi pi-exclamation-circle text-cms-danger-600' aria-hidden='true'></i>
          { message }
        </m.div>
      )}
    </AnimatePresence>
  )
}

export default InputError
