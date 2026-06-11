import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
const mockLocation = { state: null }
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

const mockListClients = vi.fn()
vi.mock('../../api/clients.js', () => ({
  listClients: (...a) => mockListClients(...a),
}))

vi.mock('../../components/Icons.jsx', () => ({
  SearchIcon: () => <span data-testid="search-icon" />,
}))

import Identification from '../Identification.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<Identification />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Identification', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockListClients.mockReset()
    mockLocation.state = null
  })

  // -------------------------------------------------------------------------
  // preselectClient depuis NouveauClient (returnTo=fiche)
  // -------------------------------------------------------------------------

  it('preselectClient en location.state : redirige direct vers /fiches/nouveau', async () => {
    // Cas typique : on a créé un client depuis l'écran d'identification, on
    // revient ici avec preselectClient et on doit immédiatement enchaîner sur
    // la création de fiche sans repasser par la recherche.
    mockLocation.state = { preselectClient: { id: 42, libelle: 'Dupont M.', ppe: false } }

    renderPage()

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(
      '/fiches/nouveau',
      expect.objectContaining({
        state: expect.objectContaining({
          clientData: expect.objectContaining({ id: 42, identifie: true }),
        }),
        replace: true,
      })
    ))
  })

  // -------------------------------------------------------------------------
  // Recherche client identifié
  // -------------------------------------------------------------------------

  it('recherche : déclenche listClients après debounce, filtre identifie=true', async () => {
    mockListClients.mockResolvedValueOnce([
      { id: 1, libelle: 'Dupont M.', identifie: true, ppe: false },
      { id: 2, libelle: 'Description X', identifie: false },
    ])

    renderPage()
    await userEvent.type(
      screen.getByPlaceholderText(/Rechercher/),
      'Dup'
    )

    // Le debounce est de 300ms ; userEvent attend déjà entre les frappes,
    // mais waitFor laisse le timeout s'écouler.
    await waitFor(() => expect(mockListClients).toHaveBeenCalled(), { timeout: 2000 })
    expect(await screen.findByText(/Dupont M\./)).toBeInTheDocument()
    // Description X ne doit pas apparaître : identifie=false.
    expect(screen.queryByText('Description X')).not.toBeInTheDocument()
  })

  it('« Sélectionner » navigue vers /fiches/nouveau avec clientData', async () => {
    mockListClients.mockResolvedValueOnce([
      { id: 1, libelle: 'Dupont M.', identifie: true, ppe: true },
    ])

    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), 'Dup')
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /Sélectionner/ }))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/fiches/nouveau',
      expect.objectContaining({
        state: expect.objectContaining({
          clientData: expect.objectContaining({ id: 1, ppe: true, identifie: true }),
        }),
        replace: true,
      })
    )
  })

  it('« Voir le client » navigue vers /clients/{id} sans toucher à la fiche', async () => {
    mockListClients.mockResolvedValueOnce([
      { id: 5, libelle: 'Martin L.', identifie: true, ppe: false },
    ])

    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), 'Mar')
    await screen.findByText(/Martin L\./)

    await userEvent.click(screen.getByRole('button', { name: /Voir le client/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients/5')
  })

  it('recherche vide : aucun listClients appelé', async () => {
    renderPage()

    // Sans saisie initiale, le useEffect lance un timeout — mais doSearch
    // court-circuite si la query est vide.
    await new Promise((r) => setTimeout(r, 400))
    expect(mockListClients).not.toHaveBeenCalled()
  })

  it('« Aucun résultat » quand le backend renvoie une liste vide', async () => {
    mockListClients.mockResolvedValueOnce([])

    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), 'xyz')

    expect(await screen.findByText(/Aucun résultat/)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Client non-identifié
  // -------------------------------------------------------------------------

  it('onglet non-identifié : bouton Continuer désactivé tant que la description est vide', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /non-identifié/i }))

    const continuer = screen.getByRole('button', { name: /Continuer/ })
    expect(continuer).toBeDisabled()
  })

  it('onglet non-identifié : Continuer envoie la description comme libelle vers /fiches/nouveau', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /non-identifié/i }))

    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'Homme blond, env. 40 ans')
    await userEvent.click(screen.getByRole('button', { name: /Continuer/ }))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/fiches/nouveau',
      expect.objectContaining({
        state: expect.objectContaining({
          clientData: expect.objectContaining({
            id: null,
            identifie: false,
            libelle: 'Homme blond, env. 40 ans',
            descriptionPhysique: 'Homme blond, env. 40 ans',
          }),
        }),
        replace: true,
      })
    )
  })

  it('onglet non-identifié : Continuer ne navigue pas si description blanche', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /non-identifié/i }))

    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, '   ')
    // Le bouton est désactivé via disabled prop ; userEvent.click ne déclenche
    // pas l'événement sur un disabled, donc on capte aussi ce filet.
    await userEvent.click(screen.getByRole('button', { name: /Continuer/ }))

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Création d'un nouveau client
  // -------------------------------------------------------------------------

  it('« Créer un nouveau client » passe returnTo=fiche pour boucler le flow', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Créer un nouveau client/ }))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/clients/nouveau',
      expect.objectContaining({ state: { returnTo: 'fiche' } })
    )
  })

  // -------------------------------------------------------------------------
  // Retour
  // -------------------------------------------------------------------------

  it('bouton « Retour » → /accueil', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/accueil')
  })

  it('switch d\'onglet vide les résultats précédents', async () => {
    mockListClients.mockResolvedValueOnce([
      { id: 1, libelle: 'Dupont M.', identifie: true, ppe: false },
    ])

    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), 'Dup')
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /non-identifié/i }))
    expect(screen.queryByText(/Dupont M\./)).not.toBeInTheDocument()
  })
})
