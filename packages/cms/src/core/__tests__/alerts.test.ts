import { describe, expect, it } from 'vitest'
import { overviewAlerts } from '../alerts'
import { defineCmsConfig } from '../config'
import type { AlertChangeType, AlertPublishType } from '../alerts'

const config = defineCmsConfig({ schema: {}, basePath: '/dashboard' })
const now = Date.parse('2026-10-14T12:00:00Z')
const record = (buildStatus: AlertPublishType['buildStatus'], minutesAgo: number): AlertPublishType => ({
  buildStatus, requestedAt: new Date(now - minutesAgo * 60_000).toISOString()
})
const change = (overrides: Partial<AlertChangeType>): AlertChangeType => ({
  title: 'Nota', href: '/dashboard/colecciones/posts/d1', problems: [], warnings: [], ...overrides
})

describe('overviewAlerts', () => {
  it('is empty when everything is fine', () => {
    expect(overviewAlerts(config, record('success', 10), [change({})], now)).toEqual([])
    expect(overviewAlerts(config, record('building', 2), [], now)).toEqual([])
  })

  it('reports a failed or unconfirmed publish and sends to the publish screen', () => {
    expect(overviewAlerts(config, record('failed', 10), [], now))
      .toEqual([{ code: 'publish', status: 'failed', tone: 'error', href: '/dashboard/publicar' }])
    expect(overviewAlerts(config, record('building', 45), [], now)).toEqual([expect.objectContaining({ status: 'unconfirmed', tone: 'warning' })])
    expect(overviewAlerts(config, record('building', 25 * 60), [], now)).toEqual([])
  })

  it('reports what will not go out as expected, linking to the document', () => {
    const warning = '"Ana" (autor) está oculto: no va a aparecer en el sitio.'
    const alerts = overviewAlerts(config, null, [change({ problems: ['Portada', 'Texto'], warnings: [warning] })], now)
    expect(alerts).toEqual([
      { code: 'incomplete', tone: 'warning', title: 'Nota', fields: ['Portada', 'Texto'], href: '/dashboard/colecciones/posts/d1' },
      { code: 'reference', tone: 'warning', title: 'Nota', warning, href: '/dashboard/colecciones/posts/d1' }
    ])
  })
})
