import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: { default: 'Estudio Norte', template: '%s | Estudio Norte' },
  robots: { index: false, follow: false }
}

const EnglishLayout = ({ children }: { children: ReactNode }) => (
  <html lang='en'>
    <body>{children}</body>
  </html>
)

export default EnglishLayout
