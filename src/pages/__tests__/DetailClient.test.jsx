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
    useParams: () => ({ id: '7' }),
  }
})

const mockGetClient = vi.fn()
const mockDeleteClient = vi.fn()
vi.mock('../../api/clients.js', () => ({
  getClient: (...a) => mockGetClient(...a),
  deleteClient: (...a) => mockDeleteClient(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

vi.mock('../../components/Icons.jsx', () => ({ EyeIcon: () => <span /> }))
vi.mock('../../components/ConfirmDialog.jsx', () => ({
  default: ({ open, onConfirm, onCancel }) =>
    open ? <div data-testid="confirm">
      <button onClick={onConfirm}>OK</button>
      <button onClick={onCancel}>NON</button>
    </div> : null,
}))

import DetailClient from '../DetailClient.jsx'

const clientBase = {
  id: 7,
  identifie: true,
  libelle: 'Dupont Marie',
  nom: 'Dupont', prenom: 'Marie',
  dateNaissance: '1980-01-15',
  lieuNaissance: 'Lyon (69)',
  ppe: false,
  rue: '1 rue de la Paix', complement: '', codePostal: '75002', ville: 'Paris', pays: 'France',
  typePiece: 'CNI', numeroPiece: 'ABC123', dateDelivrance: '2020-01-01',
  prefectureDelivrance: 'Paris', paysDelivrance: null,
  descriptionPhysique: null,
  complet: true, champsManquants: [],
  fiches: [
    { id: 1, date: '2026-06-10', caissierNom: 'Bob', totalRGM: 1500, totalEntrant: 0, totalSortant: 200 },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes><Route path="*" element={<DetailClient />} /></Routes>
    </MemoryRouter>
  )
}

describe('DetailClient', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGetClient.mockReset()
    mockDeleteClient.mockReset()
    mockUseAuth.mockReset()
    mockNotify.mockReset()
  })

  it('Chargement… puis affichage du client', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderPage()

    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
    expect(await screen.findByText('Dupont Marie')).toBeInTheDocument()
    expect(screen.getByText(/1 rue de la Paix/)).toBeInTheDocument()
  })

  it('affiche l\'erreur quand getClient échoue', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockRejectedValueOnce(new Error('Client introuvable'))

    renderPage()

    expect(await screen.findByText(/Client introuvable/)).toBeInTheDocument()
  })

  it('client non identifié : affiche la description physique au lieu de l\'adresse', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce({
      ...clientBase,
      identifie: false,
      descriptionPhysique: 'Homme blond, 40 ans',
      nom: null, prenom: null,
    })

    renderPage()

    expect(await screen.findByText(/Homme blond, 40 ans/)).toBeInTheDocument()
    expect(screen.queryByText(/1 rue de la Paix/)).not.toBeInTheDocument()
  })

  it('alerte « profil incomplet » avec liste des champs manquants', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce({
      ...clientBase,
      complet: false,
      champsManquants: ['numeroPiece', 'dateDelivrance'],
    })

    renderPage()

    expect(await screen.findByText(/incomplète/)).toBeInTheDocument()
    expect(screen.getAllByText(/À compléter/).length).toBeGreaterThan(0)
  })

  it('CAISSIER : pas de bouton « Supprimer » (réservé MCD)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderPage()
    await screen.findByText('Dupont Marie')

    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument()
  })

  it('MCD : « Supprimer » ouvre la confirmation puis appelle deleteClient', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)
    mockDeleteClient.mockResolvedValueOnce(undefined)

    renderPage()
    await screen.findByText('Dupont Marie')

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(screen.getByTestId('confirm')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => expect(mockDeleteClient).toHaveBeenCalledWith('7'))
    expect(mockNavigate).toHaveBeenCalledWith('/clients')
    expect(mockNotify).toHaveBeenCalledWith('Client supprimé', 'success')
  })

  it('Supprimer en erreur : notif d\'erreur, reste sur la page', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)
    mockDeleteClient.mockRejectedValueOnce(new Error('Fiches associées'))

    renderPage()
    await screen.findByText('Dupont Marie')

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => expect(mockNotify)
      .toHaveBeenCalledWith(expect.stringContaining('Fiches associées'), 'error'))
    expect(mockNavigate).not.toHaveBeenCalledWith('/clients')
  })

  it('« Modifier » → /clients/{id}/modifier', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderPage()
    await screen.findByText('Dupont Marie')

    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients/7/modifier')
  })

  it('« + Ajouter une fiche » : passe preselectClient pour skipper l\'identification', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderPage()
    await screen.findByText('Dupont Marie')

    await userEvent.click(screen.getByRole('button', { name: /Ajouter une fiche/ }))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/fiches/identification',
      expect.objectContaining({
        state: expect.objectContaining({
          preselectClient: expect.objectContaining({ id: 7 }),
        }),
      })
    )
  })

  it('« Retour » → navigate(-1) (revient à la liste ou l\'écran précédent)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('affiche les fiches associées dans le tableau', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderPage()

    expect(await screen.findByText('Bob')).toBeInTheDocument()
  })

  it('liste vide de fiches : affiche « Aucune fiche »', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce({ ...clientBase, fiches: [] })

    renderPage()

    expect(await screen.findByText(/Aucune fiche/)).toBeInTheDocument()
  })
})
