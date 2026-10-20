import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// A playground: never indexed. Each page titles itself through cms.site.metadata().
export const metadata: Metadata = {
  robots: { index: false, follow: false }
}

const EnglishLayout = ({ children }: { children: ReactNode }) => (
  <html lang='en'>
    <body>{children}</body>
  </html>
)

export default EnglishLayout
