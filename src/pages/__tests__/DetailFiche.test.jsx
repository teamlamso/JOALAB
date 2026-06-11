import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '11' }),
  }
})

const mockGetFiche = vi.fn()
const mockDeleteFiche = vi.fn()
vi.mock('../../api/fiches.js', () => ({
  getFiche: (...a) => mockGetFiche(...a),
  deleteFiche: (...a) => mockDeleteFiche(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

const mockImprimerSousFiche = vi.fn()
vi.mock('../../utils/print.js', async () => {
  const actual = await vi.importActual('../../utils/print.js')
  return {
    ...actual,
    imprimerSousFiche: (...a) => mockImprimerSousFiche(...a),
  }
})

vi.mock('../../components/FichePapier.jsx', () => ({
  default: ({ typeFiltre }) => <div data-testid={`papier-${typeFiltre ?? 'all'}`} />,
}))
vi.mock('../../components/HistoriqueFicheDialog.jsx', () => ({
  default: ({ onClose }) => <div data-testid="histo"><button onClick={onClose}>X</button></div>,
}))
vi.mock('../../components/ConfirmDialog.jsx', () => ({
  default: ({ open, onConfirm, onCancel }) =>
    open ? <div data-testid="confirm">
      <button onClick={onConfirm}>OK</button>
      <button onClick={onCancel}>NON</button>
    </div> : null,
}))

import DetailFiche from '../DetailFiche.jsx'

const ficheBase = {
  id: 11,
  date: '2026-06-10',
  clientId: 7,
  clientLibelle: 'Dupont Marie',
  clientPpe: false,
  clientComplet: true,
  clientChampsManquants: [],
  creePar: 'Bob',
  dateModification: null,
  modifiePar: null,
  lignes: [
    { id: 1, typeJeu: 'MAS', montantRGM: 1000 },
    { id: 2, typeJeu: 'JT',  changeEntrant: 500 },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes><Route path="*" element={<DetailFiche />} /></Routes>
    </MemoryRouter>
  )
}

describe('DetailFiche', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGetFiche.mockReset()
    mockDeleteFiche.mockReset()
    mockUseAuth.mockReset()
    mockNotify.mockReset()
    mockImprimerSousFiche.mockReset()
  })

  it('Chargement… puis affichage des sous-fiches par type de jeu', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()

    expect(await screen.findByTestId('papier-MAS')).toBeInTheDocument()
    expect(screen.getByTestId('papier-JT')).toBeInTheDocument()
    expect(screen.queryByTestId('papier-JTE')).not.toBeInTheDocument()
  })

  it('fiche sans lignes : affiche un papier « tout » (typeFiltre=null)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce({ ...ficheBase, lignes: [] })

    renderPage()

    expect(await screen.findByTestId('papier-all')).toBeInTheDocument()
  })

  it('CAISSIER (fiche très ancienne) : pas de bouton « Compléter » ni « Supprimer »', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetFiche.mockResolvedValueOnce({ ...ficheBase, date: '2026-01-01' })

    renderPage()
    await screen.findByText(/Détail de la fiche/)

    expect(screen.queryByRole('button', { name: /Compléter la fiche/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument()
  })

  it('CAISSIER (fiche d\'aujourd\'hui) : pas de bouton « Historique » (réservé Responsable/MCD)', async () => {
    // Date du jour réel : prend la valeur ISO d'aujourd'hui pour passer la
    // garde peutModifierFiche, indépendamment de l'horloge en test.
    const today = new Date().toISOString().slice(0, 10)
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetFiche.mockResolvedValueOnce({ ...ficheBase, date: today })

    renderPage()
    await screen.findByText(/Détail de la fiche/)

    expect(screen.queryByRole('button', { name: 'Historique' })).not.toBeInTheDocument()
  })

  it('MCD : affiche « Historique » et bouton ouvre la modale', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()
    await screen.findByText(/Détail de la fiche/)

    await userEvent.click(screen.getByRole('button', { name: 'Historique' }))
    expect(screen.getByTestId('histo')).toBeInTheDocument()
  })

  it('« Imprimer cette fiche » appelle imprimerSousFiche pour le type courant', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()
    await screen.findByText(/Détail de la fiche/)

    const boutons = screen.getAllByRole('button', { name: /Imprimer cette fiche/ })
    await userEvent.click(boutons[0])

    expect(mockImprimerSousFiche).toHaveBeenCalledOnce()
    expect(mockImprimerSousFiche.mock.calls[0][1]).toBe('MAS')
  })

  it('« Voir le client » → /clients/{clientId}', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Voir le client/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients/7')
  })

  it('« Compléter la fiche » → /fiches/{id}/modifier (MCD, fiche modifiable)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Compléter la fiche/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/fiches/11/modifier')
  })

  it('Supprimer ouvre la confirmation puis appelle deleteFiche puis /accueil', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)
    mockDeleteFiche.mockResolvedValueOnce(undefined)

    renderPage()
    await screen.findByText(/Détail de la fiche/)

    await userEvent.click(screen.getByRole('button', { name: /^Supprimer/ }))
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => expect(mockDeleteFiche).toHaveBeenCalledWith('11'))
    expect(mockNavigate).toHaveBeenCalledWith('/accueil')
  })

  it('Profil client incomplet + peut modifier : bouton « Compléter le profil » avec returnTo', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce({
      ...ficheBase,
      clientComplet: false,
      clientChampsManquants: ['numeroPiece'],
    })

    renderPage()
    await screen.findByText(/Détail de la fiche/)

    await userEvent.click(screen.getByRole('button', { name: /Compléter le profil/ }))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/clients/7/modifier',
      expect.objectContaining({ state: { returnTo: '/fiches/11' } })
    )
  })

  it('« Retour » → navigate(-1)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })
})
