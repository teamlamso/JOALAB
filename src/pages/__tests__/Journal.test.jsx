import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockListJournal = vi.fn()
vi.mock('../../api/journal.js', () => ({
  listJournal: (...a) => mockListJournal(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

import Journal from '../Journal.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<Journal />} />
      </Routes>
    </MemoryRouter>
  )
}

const entreeBase = {
  id: 1,
  horodatage: '2026-06-10T14:30:00',
  utilisateurNom: 'Dupont Jean',
  utilisateurIdentifiant: 'mcd1',
  action: 'CREATION',
  typeEntite: 'CLIENT',
  entiteId: 42,
  libelleEntite: 'Martin L.',
  description: 'Création client identifié',
}

describe('Journal', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockListJournal.mockReset()
    mockUseAuth.mockReset()
  })

  // -------------------------------------------------------------------------
  // Garde-fou MCD : les autres rôles sont redirigés
  // -------------------------------------------------------------------------

  it('CAISSIER : redirige vers /accueil sans afficher le journal', async () => {
    // Garde côté UI ; le backend rejette aussi mais on ne veut pas afficher
    // un état « Chargement… » qui n'aboutira jamais à un tableau lisible.
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockListJournal.mockResolvedValueOnce([])

    renderPage()

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/accueil', { replace: true })
    )
  })

  it('RESPONSABLE_CAISSE : aussi redirigé (journal réservé MCD)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'RESPONSABLE_CAISSE' } })
    mockListJournal.mockResolvedValueOnce([])

    renderPage()

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/accueil', { replace: true })
    )
  })

  it('MCD : reste sur la page', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockResolvedValueOnce([entreeBase])

    renderPage()
    await screen.findByText(/Dupont Jean/)

    expect(mockNavigate).not.toHaveBeenCalledWith('/accueil', { replace: true })
  })

  // -------------------------------------------------------------------------
  // Affichage des entrées
  // -------------------------------------------------------------------------

  it('affiche « Chargement… » pendant l\'appel listJournal', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche le compteur d\'entrées dans le sous-titre', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockResolvedValueOnce([entreeBase, { ...entreeBase, id: 2 }])

    renderPage()

    expect(await screen.findByText(/2 dernières actions/)).toBeInTheDocument()
  })

  it('liste vide : affiche le placeholder', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByText(/Aucune action enregistrée/)).toBeInTheDocument()
  })

  it('affiche l\'erreur quand le backend rejette', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockRejectedValueOnce(new Error('Accès refusé'))

    renderPage()

    expect(await screen.findByText(/Accès refusé/)).toBeInTheDocument()
  })

  it('mappe l\'action sur son libellé et applique la classe correspondante', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockResolvedValueOnce([
      { ...entreeBase, id: 1, action: 'CREATION' },
      { ...entreeBase, id: 2, action: 'MODIFICATION' },
      { ...entreeBase, id: 3, action: 'SUPPRESSION' },
      { ...entreeBase, id: 4, action: 'CONNEXION' },
    ])

    renderPage()

    expect(await screen.findByText('Création')).toHaveClass('badge-action-creation')
    expect(screen.getByText('Modification')).toHaveClass('badge-action-modification')
    expect(screen.getByText('Suppression')).toHaveClass('badge-action-suppression')
    expect(screen.getByText('Connexion')).toHaveClass('badge-action-session')
  })

  it('affiche l\'entité avec son id et son libellé', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockResolvedValueOnce([entreeBase])

    renderPage()

    expect(await screen.findByText('Client #42')).toBeInTheDocument()
    expect(screen.getByText('Martin L.')).toBeInTheDocument()
  })

  it('affiche « — » comme placeholder quand utilisateur ou description manquent', async () => {
    // CONNEXION par un compte supprimé : on doit dégrader gracieusement plutôt
    // que d'afficher « null » dans les cellules.
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockResolvedValueOnce([
      { ...entreeBase, utilisateurNom: null, utilisateurIdentifiant: null, description: null },
    ])

    renderPage()

    await screen.findByText(/2026-06-10/)
    // Deux placeholders : utilisateur et description.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('entité sans id : affiche juste le type', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockResolvedValueOnce([
      { ...entreeBase, typeEntite: 'UTILISATEUR', entiteId: null, libelleEntite: null },
    ])

    renderPage()

    // « Utilisateur » apparaît aussi en tête de colonne (<th>). On cible la
    // cellule de données via le rôle.
    const cellules = await screen.findAllByRole('cell')
    const cible = cellules.find((c) => c.textContent === 'Utilisateur')
    expect(cible).toBeTruthy()
  })

  // -------------------------------------------------------------------------
  // Bouton Retour
  // -------------------------------------------------------------------------

  it('bouton Retour → /accueil', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockListJournal.mockResolvedValueOnce([])

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/accueil')
  })
})
