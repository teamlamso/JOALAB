import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockListFiches = vi.fn()
vi.mock('../../api/fiches.js', () => ({
  listFiches: (...a) => mockListFiches(...a),
}))

const mockListClients = vi.fn()
vi.mock('../../api/clients.js', () => ({
  listClients: (...a) => mockListClients(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

// Stubs simples pour les sous-composants.
vi.mock('../../components/DatePickerInput.jsx', () => ({
  default: ({ value, onChange }) => (
    <input data-testid="date-picker" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}))
vi.mock('../../components/Icons.jsx', () => ({
  SearchIcon: () => <span />, ClearIcon: () => <span />,
  EditIcon: () => <span />, EyeIcon: () => <span />,
  WarningIcon: ({ title }) => <span data-testid="warn" title={title} />,
}))

import Accueil from '../Accueil.jsx'
import { workDay, workDayYesterday } from '../../utils/formatters.js'

function renderPage(query = '') {
  return render(
    <MemoryRouter initialEntries={[`/accueil${query}`]}>
      <Accueil />
    </MemoryRouter>
  )
}

const ficheJour = (overrides) => ({
  id: 1, date: workDay(), clientId: 7, clientLibelle: 'Dupont M.',
  clientPpe: false, clientComplet: true, clientChampsManquants: [],
  typesJeu: ['MAS'], totalRGM: 1000, totalEntrant: 0, totalSortant: 0,
  derniereModif: '14:00', derniereModifDate: workDay(),
  ...overrides,
})
const ficheVeille = (overrides) => ({
  ...ficheJour(), id: 2, date: workDayYesterday(),
  totalEntrant: 2500, totalSortant: 0,
  ...overrides,
})

describe('Accueil', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockListFiches.mockReset()
    mockListClients.mockReset()
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
  })

  // -------------------------------------------------------------------------
  // Chargement et états initiaux
  // -------------------------------------------------------------------------

  it('affiche Chargement… puis les fiches', async () => {
    mockListFiches.mockResolvedValueOnce([ficheJour()])

    renderPage()

    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
    expect(await screen.findByText('Dupont M.')).toBeInTheDocument()
  })

  it('appelle listFiches avec la plage de dates par défaut (hier → aujourd\'hui)', async () => {
    mockListFiches.mockResolvedValueOnce([])

    renderPage()

    await waitFor(() => expect(mockListFiches).toHaveBeenCalledWith({
      dateDebut: workDayYesterday(),
      dateFin:   workDay(),
      search:    '',
    }))
  })

  it('aucune fiche : empty-state contextualisé selon la recherche', async () => {
    mockListFiches.mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByText(/Aucune fiche pour cette période/)).toBeInTheDocument()
  })

  it('recherche active et aucun résultat : message « ni fiche ni client »', async () => {
    mockListFiches.mockResolvedValueOnce([])
    mockListClients.mockResolvedValueOnce([])

    renderPage('?q=zzz')

    expect(await screen.findByText(/Aucune fiche ni client correspondant/)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Sections fiches du jour / veille / dépassement 2000 €
  // -------------------------------------------------------------------------

  it('sépare fiches du jour et fiches de la veille', async () => {
    mockListFiches.mockResolvedValueOnce([
      ficheJour({ id: 1, clientLibelle: 'Aujourd\'hui' }),
      ficheVeille({ id: 2, clientLibelle: 'Hier' }),
    ])

    renderPage()

    expect(await screen.findByText(/Fiches du jour \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Fiches de la veille \(1\)/)).toBeInTheDocument()
  })

  it('met en haut le sous-bloc « Dépassant 2 000 € » sur la veille', async () => {
    mockListFiches.mockResolvedValueOnce([
      ficheVeille({ id: 1, clientLibelle: 'Gros' }),  // totalEntrant 2500
      ficheVeille({ id: 2, clientLibelle: 'Petit', totalEntrant: 100, totalSortant: 50 }),
    ])

    renderPage()

    expect(await screen.findByText(/Dépassant 2 000 € \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Autres \(1\)/)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Recherche + URL state
  // -------------------------------------------------------------------------

  it('saisie d\'une recherche : déclenche listFiches+listClients (debounce)', async () => {
    mockListFiches.mockResolvedValueOnce([])  // initial
    mockListFiches.mockResolvedValueOnce([])  // après recherche
    mockListClients.mockResolvedValueOnce([])

    renderPage()
    await screen.findByText(/Aucune fiche/)

    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), 'Dup')

    await waitFor(() => expect(mockListClients).toHaveBeenCalledWith('Dup'), { timeout: 2000 })
  })

  // -------------------------------------------------------------------------
  // Carte fiche : badges, warning, navigation
  // -------------------------------------------------------------------------

  it('affiche le badge PPE quand clientPpe=true', async () => {
    mockListFiches.mockResolvedValueOnce([ficheJour({ clientPpe: true })])

    renderPage()

    expect(await screen.findByText('PPE')).toHaveClass('badge-ppe')
  })

  it('affiche un picto warning quand clientComplet=false avec champs manquants en tooltip', async () => {
    mockListFiches.mockResolvedValueOnce([
      ficheJour({ clientComplet: false, clientChampsManquants: ['numeroPiece'] }),
    ])

    renderPage()

    const warn = await screen.findByTestId('warn')
    expect(warn).toHaveAttribute('title', expect.stringMatching(/Champs manquants/))
  })

  it('boutons Modifier/Eye sur les cartes : naviguent vers /fiches/{id}/modifier et /fiches/{id}', async () => {
    mockListFiches.mockResolvedValueOnce([ficheJour({ id: 42 })])

    renderPage()
    await screen.findByText('Dupont M.')

    await userEvent.click(screen.getByTitle('Modifier'))
    expect(mockNavigate).toHaveBeenCalledWith('/fiches/42/modifier')

    await userEvent.click(screen.getByTitle('Voir le détail'))
    expect(mockNavigate).toHaveBeenCalledWith('/fiches/42')
  })

  it('CAISSIER : pas de bouton « Modifier » sur une fiche d\'avant-hier', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'CAISSIER' } })
    mockListFiches.mockResolvedValueOnce([
      ficheVeille({ id: 9, date: '2026-01-01' }),  // très ancienne
    ])

    renderPage()
    await screen.findByText('Dupont M.')

    expect(screen.queryByTitle('Modifier')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Boutons globaux
  // -------------------------------------------------------------------------

  it('« Voir les clients » → /clients', async () => {
    mockListFiches.mockResolvedValueOnce([])

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Voir les clients/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients')
  })

  it('« + Ajouter une fiche » → /fiches/identification', async () => {
    mockListFiches.mockResolvedValueOnce([])

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Ajouter une fiche/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/fiches/identification')
  })

  it('« Visualiser toutes les fiches de la veille » → /fiches/imprimer?ids=…', async () => {
    mockListFiches.mockResolvedValueOnce([
      ficheVeille({ id: 1 }), ficheVeille({ id: 2 }),
    ])

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Visualiser toutes les fiches de la veille/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/fiches/imprimer?ids=1,2')
  })
})
