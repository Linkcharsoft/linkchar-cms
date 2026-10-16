import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Panel · Estudio Norte',
  robots: { index: false, follow: false }
}

const CmsLayout = ({ children }: { children: ReactNode }) => (
  <html lang='es'>
    <body style={{ fontFamily: 'system-ui, sans-serif', margin: 24 }}>{children}</body>
  </html>
)

export default CmsLayout
