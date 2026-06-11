import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockListUtilisateurs = vi.fn()
const mockArchiver = vi.fn()
const mockDesarchiver = vi.fn()
vi.mock('../../api/utilisateurs.js', () => ({
  listUtilisateurs: (...a) => mockListUtilisateurs(...a),
  archiverUtilisateur: (...a) => mockArchiver(...a),
  desarchiverUtilisateur: (...a) => mockDesarchiver(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

vi.mock('../../components/Icons.jsx', () => ({
  SearchIcon: () => <span />,
}))

import ListeUtilisateurs from '../ListeUtilisateurs.jsx'

const utilisateurs = [
  { id: 1, identifiant: 'mcd1',     nom: 'Smith',  prenom: 'Alice', role: 'MCD',                archive: false },
  { id: 2, identifiant: 'caissier2', nom: 'Doe',   prenom: 'Bob',   role: 'CAISSIER',           archive: false },
  { id: 3, identifiant: 'archived',  nom: 'Brown', prenom: 'Carol', role: 'RESPONSABLE_CAISSE', archive: true  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes><Route path="*" element={<ListeUtilisateurs />} /></Routes>
    </MemoryRouter>
  )
}

describe('ListeUtilisateurs', () => {
  let originalConfirm
  beforeEach(() => {
    mockNavigate.mockReset()
    mockListUtilisateurs.mockReset()
    mockArchiver.mockReset()
    mockDesarchiver.mockReset()
    mockUseAuth.mockReset()
    mockNotify.mockReset()
    originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)
  })
  afterEach(() => { window.confirm = originalConfirm })

  it('CAISSIER : redirige vers /accueil', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 99, role: 'CAISSIER' } })
    mockListUtilisateurs.mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(mockNavigate)
      .toHaveBeenCalledWith('/accueil', { replace: true }))
  })

  it('charge la liste et affiche les utilisateurs', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce(utilisateurs.filter((u) => !u.archive))

    renderPage()

    expect(await screen.findByText('Smith')).toBeInTheDocument()
    expect(screen.getByText('Doe')).toBeInTheDocument()
    expect(mockListUtilisateurs).toHaveBeenCalledWith({ includeArchives: false })
  })

  it('checkbox archives : recharge avec includeArchives=true', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce(utilisateurs.filter((u) => !u.archive))
    mockListUtilisateurs.mockResolvedValueOnce(utilisateurs)

    renderPage()
    await screen.findByText('Smith')

    await userEvent.click(screen.getByRole('checkbox'))

    await waitFor(() => expect(mockListUtilisateurs)
      .toHaveBeenLastCalledWith({ includeArchives: true }))
    expect(await screen.findByText('Brown')).toBeInTheDocument()
  })

  it('filtre client par nom/prénom/identifiant', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce([utilisateurs[0], utilisateurs[1]])

    renderPage()
    await screen.findByText('Smith')

    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), 'bob')

    expect(screen.queryByText('Smith')).not.toBeInTheDocument()
    expect(screen.getByText('Doe')).toBeInTheDocument()
  })

  it('Modifier : navigue avec utilisateur en state', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce([utilisateurs[1]])

    renderPage()
    await screen.findByText('Doe')

    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/utilisateurs/2/modifier',
      expect.objectContaining({ state: { utilisateur: utilisateurs[1] } })
    )
  })

  it('Archiver demande confirmation puis appelle l\'API', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValue([utilisateurs[1]])
    mockArchiver.mockResolvedValue(undefined)

    renderPage()
    await screen.findByText('Doe')

    await userEvent.click(screen.getByRole('button', { name: 'Archiver' }))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(mockArchiver).toHaveBeenCalledWith(2))
    expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('archivé'), 'success')
  })

  it('Archiver : si confirm() refuse, n\'appelle pas l\'API', async () => {
    window.confirm = vi.fn(() => false)
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce([utilisateurs[1]])

    renderPage()
    await screen.findByText('Doe')
    await userEvent.click(screen.getByRole('button', { name: 'Archiver' }))

    expect(mockArchiver).not.toHaveBeenCalled()
  })

  it('on ne peut pas archiver son propre compte (bouton désactivé)', async () => {
    // Garde-fou contre l'auto-déconnexion : un MCD pourrait sinon se mettre
    // hors-jeu et n'aurait plus moyen de revenir.
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce([utilisateurs[0]])

    renderPage()
    await screen.findByText('Smith')

    expect(screen.getByRole('button', { name: 'Archiver' })).toBeDisabled()
  })

  it('Réactiver : appelle desarchiverUtilisateur sur les comptes archivés', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    // Plusieurs rechargements possibles : initial + après checkbox + après
    // l'action Réactiver. On retourne toujours la même liste plutôt que de
    // compter au pixel près.
    mockListUtilisateurs.mockResolvedValue([utilisateurs[2]])
    mockDesarchiver.mockResolvedValue(undefined)

    renderPage()
    await userEvent.click(screen.getByRole('checkbox'))
    await screen.findByText('Brown')

    await userEvent.click(screen.getByRole('button', { name: /Réactiver/ }))

    await waitFor(() => expect(mockDesarchiver).toHaveBeenCalledWith(3))
  })

  it('liste vide : affiche le placeholder', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByText(/Aucun utilisateur trouvé/)).toBeInTheDocument()
  })

  it('bouton Retour → /accueil', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce([])

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/accueil')
  })
})
