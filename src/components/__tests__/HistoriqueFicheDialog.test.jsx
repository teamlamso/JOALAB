import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockGetHistoriqueFiche = vi.fn()
vi.mock('../../api/journal.js', () => ({
  getHistoriqueFiche: (...a) => mockGetHistoriqueFiche(...a),
}))

import HistoriqueFicheDialog from '../HistoriqueFicheDialog.jsx'

describe('HistoriqueFicheDialog', () => {
  beforeEach(() => {
    mockGetHistoriqueFiche.mockReset()
  })

  it('Chargement… pendant l\'appel API', () => {
    mockGetHistoriqueFiche.mockReturnValue(new Promise(() => {}))

    render(<HistoriqueFicheDialog ficheId={42} onClose={() => {}} />)

    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
    expect(screen.getByText(/Historique de la fiche #42/)).toBeInTheDocument()
  })

  it('liste vide : affiche le placeholder', async () => {
    mockGetHistoriqueFiche.mockResolvedValueOnce([])

    render(<HistoriqueFicheDialog ficheId={42} onClose={() => {}} />)

    expect(await screen.findByText(/Aucune action enregistrée/)).toBeInTheDocument()
  })

  it('liste les entrées avec leur badge d\'action', async () => {
    mockGetHistoriqueFiche.mockResolvedValueOnce([
      { id: 1, action: 'CREATION',     horodatage: '2026-06-10T10:00', utilisateurNom: 'Alice', description: 'Fiche créée' },
      { id: 2, action: 'MODIFICATION', horodatage: '2026-06-10T11:00', utilisateurNom: 'Bob',   description: 'Ligne ajoutée' },
    ])

    render(<HistoriqueFicheDialog ficheId={42} onClose={() => {}} />)

    expect(await screen.findByText('Création')).toHaveClass('badge-action-creation')
    expect(screen.getByText('Modification')).toHaveClass('badge-action-modification')
    expect(screen.getByText(/Fiche créée/)).toBeInTheDocument()
    expect(screen.getByText(/Ligne ajoutée/)).toBeInTheDocument()
  })

  it('utilisateurNom null → libellé « utilisateur inconnu »', async () => {
    mockGetHistoriqueFiche.mockResolvedValueOnce([
      { id: 1, action: 'CREATION', horodatage: '2026-06-10', utilisateurNom: null },
    ])

    render(<HistoriqueFicheDialog ficheId={42} onClose={() => {}} />)

    expect(await screen.findByText(/utilisateur inconnu/)).toBeInTheDocument()
  })

  it('affiche l\'erreur quand l\'API rejette', async () => {
    mockGetHistoriqueFiche.mockRejectedValueOnce(new Error('Accès refusé'))

    render(<HistoriqueFicheDialog ficheId={42} onClose={() => {}} />)

    expect(await screen.findByText(/Accès refusé/)).toBeInTheDocument()
  })

  it('« Fermer » appelle onClose', async () => {
    const onClose = vi.fn()
    mockGetHistoriqueFiche.mockResolvedValueOnce([])

    render(<HistoriqueFicheDialog ficheId={42} onClose={onClose} />)

    await screen.findByText(/Aucune action/)
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clic sur le voile (overlay) ferme la modale', async () => {
    const onClose = vi.fn()
    mockGetHistoriqueFiche.mockResolvedValueOnce([])

    const { container } = render(<HistoriqueFicheDialog ficheId={42} onClose={onClose} />)
    await screen.findByText(/Aucune action/)

    await userEvent.click(container.querySelector('.modal-overlay'))

    expect(onClose).toHaveBeenCalled()
  })

  it('clic dans la modale (pas l\'overlay) ne ferme pas', async () => {
    const onClose = vi.fn()
    mockGetHistoriqueFiche.mockResolvedValueOnce([])

    const { container } = render(<HistoriqueFicheDialog ficheId={42} onClose={onClose} />)
    await screen.findByText(/Aucune action/)

    await userEvent.click(container.querySelector('.modal'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('change de ficheId : refait l\'appel API', async () => {
    mockGetHistoriqueFiche.mockResolvedValue([])

    const { rerender } = render(<HistoriqueFicheDialog ficheId={1} onClose={() => {}} />)
    await waitFor(() => expect(mockGetHistoriqueFiche).toHaveBeenCalledWith(1))

    rerender(<HistoriqueFicheDialog ficheId={2} onClose={() => {}} />)

    await waitFor(() => expect(mockGetHistoriqueFiche).toHaveBeenCalledWith(2))
  })
})
