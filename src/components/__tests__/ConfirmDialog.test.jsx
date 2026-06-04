import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from '../ConfirmDialog.jsx'

describe('ConfirmDialog', () => {
  it('ne rend rien si open=false', () => {
    const { container } = render(
      <ConfirmDialog open={false} message="msg" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche titre, message et boutons par défaut', () => {
    render(
      <ConfirmDialog open title="Supprimer ?" message="Cette action est irréversible." onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('Supprimer ?')).toBeInTheDocument()
    expect(screen.getByText(/irréversible/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
  })

  it('libellés personnalisés', () => {
    render(
      <ConfirmDialog open message="msg" confirmLabel="Supprimer" cancelLabel="Garder" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Garder' })).toBeInTheDocument()
  })

  it('applique la classe danger au bouton de confirmation', () => {
    render(
      <ConfirmDialog open message="msg" variant="danger" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'Confirmer' })).toHaveClass('btn-danger')
  })

  it('clic Confirmer appelle onConfirm', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open message="msg" onConfirm={onConfirm} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('clic Annuler appelle onCancel', async () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog open message="msg" onConfirm={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('clic sur l\'overlay appelle onCancel', async () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog open message="msg" onConfirm={() => {}} onCancel={onCancel} />)
    await userEvent.click(document.querySelector('.modal-overlay'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('clic dans le modal n\'appelle pas onCancel (stopPropagation)', async () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog open message="msg" onConfirm={() => {}} onCancel={onCancel} />)
    await userEvent.click(document.querySelector('.modal'))
    expect(onCancel).not.toHaveBeenCalled()
  })
})
