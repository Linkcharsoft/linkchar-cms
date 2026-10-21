'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { createTranslator } from '../core/i18n'
import type { CSSProperties } from 'react'

interface Props {
  // Language of the exit link: a locale of the package catalogs ("es", "en").
  locale?: string
  // Replaces the catalog text of the exit link.
  label?: string
  // Replaces the default look of the exit link.
  className?: string
}

const ANCHOR = /^[\w-]+$/

const EXIT_PATH = '/api/cms/disable-draft'

const STYLE: CSSProperties = {
  position: 'fixed',
  bottom: 16,
  left: 16,
  zIndex: 60,
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  padding: '0 16px',
  borderRadius: 999,
  background: '#10284a',
  color: '#ffffff',
  font: '600 14px/1.2 system-ui, sans-serif',
  textDecoration: 'none',
  boxShadow: '0 8px 24px rgb(0 0 0 / 0.18)'
}

// Render it only in Draft Mode: the panel preview posts "cms:refresh" after each autosave and "cms:scroll" on section focus.
const DraftRefresh = ({ locale = 'es', label, className }: Props) => {
  const router = useRouter()
  const text = useMemo(() => label ?? createTranslator({ locale }).t('site.draftExit'), [label, locale])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'cms:refresh') router.refresh()
      if (event.data?.type === 'cms:scroll' && typeof event.data.anchor === 'string' && ANCHOR.test(event.data.anchor)) {
        document.getElementById(event.data.anchor)?.scrollIntoView({ block: 'start' })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [router])

  // A plain <a>: the exit is a route handler, it needs a full navigation.
  return (
    <a href={EXIT_PATH} className={className} style={className ? undefined : STYLE} data-cms-draft-exit=''>
      {text}
    </a>
  )
}

export default DraftRefresh
