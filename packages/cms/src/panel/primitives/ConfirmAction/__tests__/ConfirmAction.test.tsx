import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPanel } from '../../../__tests__/render'
import { useConfirm } from '../ConfirmAction'
import type { ConfirmActionOptionsType } from '../ConfirmAction'
import type { ConfirmDialogProps } from 'primereact/confirmdialog'
import type { ReactNode } from 'react'

const confirmDialog = vi.hoisted(() => vi.fn())
vi.mock('primereact/confirmdialog', () => ({ confirmDialog, ConfirmDialog: () => null }))

const Opener = ({ options }: { options: ConfirmActionOptionsType }) => {
  const confirm = useConfirm()
  return <button type='button' onClick={() => confirm(options)}>open</button>
}

const open = (options: ConfirmActionOptionsType) => {
  renderPanel(<Opener options={options} />)
  fireEvent.click(screen.getByRole('button', { name: 'open' }))
  return confirmDialog.mock.lastCall![0] as ConfirmDialogProps
}

const renderFooter = (options: ConfirmDialogProps) => {
  cleanup()
  const accept = vi.fn()
  const reject = vi.fn()
  const footer = options.footer as (options: { accept: () => void, reject: () => void }) => ReactNode
  renderPanel(<>{footer({ accept, reject })}</>)
  return { accept, reject }
}

afterEach(cleanup)

describe('useConfirm', () => {
  it('passes header, message and callbacks to the dialog', () => {
    const accept = vi.fn()
    const options = open({ header: 'Borrar', message: '¿Seguro?', acceptLabel: 'Borrar', tone: 'danger', accept })
    expect(options.header).toBe('Borrar')
    expect(options.message).toBe('¿Seguro?')
    expect(options.accept).toBe(accept)
  })

  it('renders a cancel button in the panel language and a danger accept button', () => {
    const { accept, reject } = renderFooter(open({ header: 'Borrar', message: '¿Seguro?', acceptLabel: 'Borrar para siempre', tone: 'danger', accept: vi.fn() }))
    const acceptButton = screen.getByRole('button', { name: 'Borrar para siempre' })
    expect(acceptButton.className).toContain('CustomButton--Danger')
    fireEvent.click(acceptButton)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(accept).toHaveBeenCalledOnce()
    expect(reject).toHaveBeenCalledOnce()
  })

  it('defaults to a primary accept button', () => {
    renderFooter(open({ header: 'Publicar', message: 'Se publica todo', acceptLabel: 'Publicar', accept: vi.fn() }))
    expect(screen.getByRole('button', { name: 'Publicar' }).className).toContain('CustomButton--Primary')
  })
})

describe('render without the panel', () => {
  it('explains where panel components must live', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Opener options={{ header: '', message: '', acceptLabel: '', accept: vi.fn() }} />)).toThrow('CmsClient')
  })
})
