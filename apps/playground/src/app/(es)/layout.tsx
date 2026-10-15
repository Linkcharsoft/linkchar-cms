import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: { default: 'Estudio Norte', template: '%s | Estudio Norte' },
  robots: { index: false, follow: false }
}

const SpanishLayout = ({ children }: { children: ReactNode }) => (
  <html lang='es'>
    <body>{children}</body>
  </html>
)

export default SpanishLayout
