'use client'
import 'primeicons/primeicons.css'
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { PrimeReactProvider } from 'primereact/api'
import ConfirmAction from '../primitives/ConfirmAction/ConfirmAction'
import mergeClassNames from '../theme/mergeClassNames'
import { primeLocale } from '../theme/primeLocale'
import PRIME_PT from '../theme/pt'
import { NotifyProvider } from './notify'
import type { APIOptions } from 'primereact/api'
import type { ReactNode } from 'react'

interface Props {
  panelLocale: string
  children: ReactNode
}

// Its own PrimeReact context: the panel stays unstyled + passthrough whatever the project's site configures.
const CmsProviders = ({ panelLocale, children }: Props) => {
  const prime: Partial<APIOptions> = {
    unstyled: true,
    pt: PRIME_PT,
    ptOptions: { mergeSections: true, mergeProps: true, classNameMergeFunction: mergeClassNames },
    locale: primeLocale(panelLocale)
  }

  return (
    <PrimeReactProvider value={prime}>
      <MotionConfig reducedMotion='user'>
        <LazyMotion features={domAnimation} strict>
          <NotifyProvider>
            {children}
            <ConfirmAction />
          </NotifyProvider>
        </LazyMotion>
      </MotionConfig>
    </PrimeReactProvider>
  )
}

export default CmsProviders
