import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockListClients = vi.fn()
vi.mock('../../api/clients.js', () => ({
  listClients: (...a) => mockListClients(...a),
}))

vi.mock('../../components/Icons.jsx', () => ({
  SearchIcon: () => <span data-testid="search-icon" />,
  EyeIcon: () => <span data-testid="eye-icon" />,
}))

import ListeClients from '../ListeClients.jsx'

const clientComplet = {
  id: 1, libelle: 'Dupont M.', dateNaissance: '1980-01-15',
  ville: 'Paris', pays: 'France', derniereActivite: '2026-06-09',
  ppe: false, complet: true, champsManquants: [],
}
const clientIncomplet = {
  id: 2, libelle: 'Martin L.', dateNaissance: null,
  ville: 'Lyon', pays: 'France', derniereActivite: null,
  ppe: true, complet: false, champsManquants: ['dateNaissance', 'numeroPiece'],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes><Route path="*" element={<ListeClients />} /></Routes>
    </MemoryRouter>
  )
}

describe('ListeClients', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockListClients.mockReset()
  })

  // -------------------------------------------------------------------------
  // Chargement initial
  // -------------------------------------------------------------------------

  it('charge la liste au montage et affiche les clients', async () => {
    mockListClients.mockResolvedValueOnce([clientComplet, clientIncomplet])

    renderPage()

    expect(await screen.findByText('Dupont M.')).toBeInTheDocument()
    expect(screen.getByText('Martin L.')).toBeInTheDocument()
  })

  it('appelle listClients avec la query vide au premier rendu', async () => {
    mockListClients.mockResolvedValueOnce([])

    renderPage()

    await waitFor(() => expect(mockListClients).toHaveBeenCalledWith(''))
  })

  it('affiche le placeholder « Aucun client trouvé » quand la liste est vide', async () => {
    mockListClients.mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByText(/Aucun client trouvé/)).toBeInTheDocument()
  })

  it('affiche l\'erreur si listClients échoue', async () => {
    mockListClients.mockRejectedValueOnce(new Error('boom'))

    renderPage()

    expect(await screen.findByText(/boom/)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Recherche (debounce)
  // -------------------------------------------------------------------------

  it('la saisie déclenche un appel listClients avec la query saisie', async () => {
    mockListClients.mockResolvedValueOnce([])  // initial
    mockListClients.mockResolvedValueOnce([clientComplet])

    renderPage()
    await screen.findByText(/Aucun client trouvé/)

    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), 'Dup')

    await waitFor(() => expect(mockListClients).toHaveBeenLastCalledWith('Dup'), { timeout: 2000 })
  })

  // -------------------------------------------------------------------------
  // Filtre « profils à compléter »
  // -------------------------------------------------------------------------

  it('compteur (X sur Y) basé sur le flag complet', async () => {
    mockListClients.mockResolvedValueOnce([clientComplet, clientIncomplet])

    renderPage()

    expect(await screen.findByText(/\(1 sur 2\)/)).toBeInTheDocument()
  })

  it('coché : masque les clients complets', async () => {
    mockListClients.mockResolvedValueOnce([clientComplet, clientIncomplet])

    renderPage()
    await screen.findByText('Dupont M.')

    await userEvent.click(screen.getByRole('checkbox'))

    expect(screen.queryByText('Dupont M.')).not.toBeInTheDocument()
    expect(screen.getByText('Martin L.')).toBeInTheDocument()
  })

  it('coché + aucun incomplet : placeholder spécifique', async () => {
    mockListClients.mockResolvedValueOnce([clientComplet])

    renderPage()
    await screen.findByText('Dupont M.')

    await userEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByText(/Aucun profil incomplet/)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Badges et navigation
  // -------------------------------------------------------------------------

  it('affiche le badge PPE et le badge « À compléter »', async () => {
    mockListClients.mockResolvedValueOnce([clientIncomplet])

    renderPage()

    expect(await screen.findByText('PPE')).toHaveClass('badge-ppe')
    expect(screen.getByText('À compléter')).toHaveClass('badge-incomplet')
  })

  it('badge « À compléter » mentionne les champs manquants en title', async () => {
    mockListClients.mockResolvedValueOnce([clientIncomplet])

    renderPage()
    const badge = await screen.findByText('À compléter')

    expect(badge).toHaveAttribute('title', expect.stringMatching(/Champs manquants/))
  })

  it('« Voir le profil » → /clients/{id}', async () => {
    mockListClients.mockResolvedValueOnce([clientComplet])

    renderPage()
    await screen.findByText('Dupont M.')

    await userEvent.click(screen.getByRole('button', { name: /Voir le profil/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients/1')
  })

  it('« + Ajouter un client » → /clients/nouveau', async () => {
    mockListClients.mockResolvedValueOnce([])

    renderPage()
    await screen.findByText(/Aucun client trouvé/)

    await userEvent.click(screen.getByRole('button', { name: /Ajouter un client/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients/nouveau')
  })

  it('« Retour » → /accueil', async () => {
    mockListClients.mockResolvedValueOnce([])

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/accueil')
  })
})
