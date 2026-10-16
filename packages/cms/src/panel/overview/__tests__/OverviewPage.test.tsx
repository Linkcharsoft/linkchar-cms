import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderPanel } from '../../__tests__/render'
import OverviewPage from '../OverviewPage/OverviewPage'

afterEach(cleanup)

describe('OverviewPage', () => {
  it('says everything is fine when there is nothing to solve', () => {
    renderPanel(<OverviewPage drafts={[]} pendingCount={0} latest={null} pages={[]} alerts={[]} />)
    expect(screen.getByText('Todo en orden.')).toBeTruthy()
    expect(screen.getByText('No hay cambios pendientes')).toBeTruthy()
    expect(screen.getByText('Todavía no se publicó nada.')).toBeTruthy()
  })

  it('writes each alert in the panel language and links to where it is solved', () => {
    renderPanel(
      <OverviewPage
        drafts={[]}
        pendingCount={2}
        latest={null}
        pages={[]}
        alerts={[
          { code: 'publish', status: 'failed', tone: 'error', href: '/dashboard/publicar' },
          { code: 'incomplete', tone: 'warning', title: 'Casa Sur', fields: ['Foto principal', 'Nombre'], href: '/dashboard/colecciones/projects/p1' }
        ]}
      />
    )
    expect(screen.getByText(/No se pudo actualizar el sitio/)).toBeTruthy()
    expect(screen.getByText('"Casa Sur" no se publica hasta completar: Foto principal, Nombre.')).toBeTruthy()
    expect(screen.getByText('2 cambios pendientes de publicar')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Ver' }).map(link => link.getAttribute('href')))
      .toEqual(['/dashboard/publicar', '/dashboard/colecciones/projects/p1'])
  })

  it('offers a create task for each collection with pages of its own', () => {
    renderPanel(<OverviewPage drafts={[]} pendingCount={0} latest={null} pages={[]} alerts={[]} />)
    expect(screen.getByRole('button', { name: /Nuevo proyecto/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Nuevo artículo/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Nueva categoría/ })).toBeNull()
  })
})
