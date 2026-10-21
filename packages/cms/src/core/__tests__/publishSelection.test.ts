import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../config'
import { translatorFor } from '../config'
import { selectionWarnings } from '../publishSelection'

const { t } = translatorFor(defineCmsConfig({ schema: {} }))

const change = { warnings: ['ya avisado'], pendingRefs: [{ id: 'cat', name: '"Reseñas" (categoría)' }], fixedUsers: [{ id: 'post', name: 'Blog › Casa' }] }

describe('selectionWarnings', () => {
  it('keeps the static warnings and adds nothing while everything is ticked', () => {
    expect(selectionWarnings(change, new Set(['cat', 'post']), t)).toEqual(['ya avisado'])
  })

  it('warns about a picked item that was left out of the publish', () => {
    expect(selectionWarnings(change, new Set(['post']), t)).toEqual(['ya avisado', '"Reseñas" (categoría) no está marcado para publicar: no va a aparecer en el sitio.'])
  })

  it('warns about a live page that keeps using a removed item when its fix was left out', () => {
    expect(selectionWarnings(change, new Set(['cat']), t)).toEqual(['ya avisado', 'Blog › Casa lo usa y sigue en el sitio: va a quedar sin este contenido.'])
  })
})
