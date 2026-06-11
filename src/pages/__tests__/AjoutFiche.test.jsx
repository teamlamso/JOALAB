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

const mockCreateClient = vi.fn()
vi.mock('../../api/clients.js', () => ({
  createClient: (...a) => mockCreateClient(...a),
}))

const mockCreateFiche = vi.fn()
vi.mock('../../api/fiches.js', () => ({
  createFiche: (...a) => mockCreateFiche(...a),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

vi.mock('../../components/ConfirmDialog.jsx', () => ({
  default: ({ open, onConfirm, onCancel }) =>
    open ? <div data-testid="confirm">
      <button onClick={onConfirm}>OK</button>
      <button onClick={onCancel}>NON</button>
    </div> : null,
}))

import AjoutFiche from '../AjoutFiche.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes><Route path="*" element={<AjoutFiche />} /></Routes>
    </MemoryRouter>
  )
}

describe('AjoutFiche', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockCreateClient.mockReset()
    mockCreateFiche.mockReset()
    mockNotify.mockReset()
    mockLocation.state = { clientData: { id: 7, libelle: 'Dupont M.', ppe: false } }
  })

  // -------------------------------------------------------------------------
  // Garde-fou : redirection vers identification si pas de clientData
  // -------------------------------------------------------------------------

  it('sans clientData en state : redirige vers /fiches/identification', () => {
    mockLocation.state = null

    renderPage()

    expect(mockNavigate).toHaveBeenCalledWith('/fiches/identification')
  })

  // -------------------------------------------------------------------------
  // Rendu initial
  // -------------------------------------------------------------------------

  it('affiche le bandeau client et une ligne vide', () => {
    renderPage()

    expect(screen.getByText('Dupont M.')).toBeInTheDocument()
    // Une seule ligne au départ → un seul Montant Online.
    expect(screen.getAllByText(/Montant Online/).length).toBe(1)
  })

  it('« Changer » → /fiches/identification', async () => {
    renderPage()

    await userEvent.click(screen.getByText('Changer'))

    expect(mockNavigate).toHaveBeenCalledWith('/fiches/identification')
  })

  // -------------------------------------------------------------------------
  // Ajout / suppression de ligne
  // -------------------------------------------------------------------------

  it('Ajouter une ligne empile une nouvelle ligne', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Ajouter une ligne/ }))

    expect(screen.getAllByText(/Montant Online/).length).toBe(2)
  })

  it('Supprimer demande confirmation', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Ajouter une ligne/ }))

    await userEvent.click(screen.getAllByTitle(/Supprimer la ligne/)[0])
    expect(screen.getByTestId('confirm')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.getAllByText(/Montant Online/).length).toBe(1)
  })

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it('refuse de soumettre une ligne sans montant', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer la fiche/ }))

    expect(await screen.findByText(/au moins un montant/i)).toBeInTheDocument()
    expect(mockCreateFiche).not.toHaveBeenCalled()
  })

  it('client PPE : peut soumettre avec une ligne vide (« rien à signaler »)', async () => {
    mockLocation.state = { clientData: { id: 7, libelle: 'Dupont M.', ppe: true } }
    mockCreateFiche.mockResolvedValueOnce({ id: 30 })

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer la fiche/ }))

    await waitFor(() => expect(mockCreateFiche).toHaveBeenCalledOnce())
    expect(mockCreateFiche.mock.calls[0][0].lignes).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Submit identifié : envoie clientId + lignes
  // -------------------------------------------------------------------------

  it('submit identifié : envoie clientId et redirige avec replace vers /fiches/{id}', async () => {
    mockCreateFiche.mockResolvedValueOnce({ id: 30 })

    renderPage()

    // Saisit un RGM valide pour passer la validation.
    const rgmInputs = screen.getAllByPlaceholderText('0 €')
    await userEvent.type(rgmInputs[0], '1000')

    // Renseigne aussi numéro de socle + type de jeu (obligatoires avec RGM).
    const numSocleInput = screen.getAllByRole('textbox')[0]
    await userEvent.type(numSocleInput, 'S1')
    await userEvent.click(screen.getByRole('button', { name: 'MAS' }))

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer la fiche/ }))

    await waitFor(() => expect(mockCreateFiche).toHaveBeenCalledOnce())
    const payload = mockCreateFiche.mock.calls[0][0]
    expect(payload.clientId).toBe(7)
    expect(payload.lignes).toHaveLength(1)
    expect(payload.lignes[0]).toMatchObject({
      typeJeu: 'MAS',
      numeroSocle: 'S1',
      montantRGM: 1000,
    })

    expect(mockNotify).toHaveBeenCalledWith('Fiche enregistrée', 'success')
    expect(mockNavigate).toHaveBeenCalledWith('/fiches/30', { replace: true })
  })

  it('createFiche sans id → redirect vers /accueil (fallback gracieux)', async () => {
    mockCreateFiche.mockResolvedValueOnce({})

    renderPage()

    const rgm = screen.getAllByPlaceholderText('0 €')[0]
    await userEvent.type(rgm, '1000')
    await userEvent.type(screen.getAllByRole('textbox')[0], 'S1')
    await userEvent.click(screen.getByRole('button', { name: 'MAS' }))

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer la fiche/ }))

    await waitFor(() => expect(mockNavigate)
      .toHaveBeenCalledWith('/accueil', { replace: true }))
  })

  // -------------------------------------------------------------------------
  // Submit non-identifié : crée le client inline d'abord
  // -------------------------------------------------------------------------

  it('non identifié : crée d\'abord le client puis la fiche', async () => {
    mockLocation.state = {
      clientData: { id: null, libelle: 'Homme blond, 40 ans', identifie: false,
                    descriptionPhysique: 'Homme blond, 40 ans', ppe: false },
    }
    mockCreateClient.mockResolvedValueOnce({ id: 50 })
    mockCreateFiche.mockResolvedValueOnce({ id: 60 })

    renderPage()

    const rgm = screen.getAllByPlaceholderText('0 €')[0]
    await userEvent.type(rgm, '1000')
    await userEvent.type(screen.getAllByRole('textbox')[0], 'S1')
    await userEvent.click(screen.getByRole('button', { name: 'MAS' }))

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer la fiche/ }))

    await waitFor(() => expect(mockCreateClient).toHaveBeenCalledOnce())
    expect(mockCreateClient).toHaveBeenCalledWith({
      identifie: false,
      descriptionPhysique: 'Homme blond, 40 ans',
    })
    await waitFor(() => expect(mockCreateFiche).toHaveBeenCalled())
    expect(mockCreateFiche.mock.calls[0][0].clientId).toBe(50)
  })

  it('non identifié + createClient échoue : pas de createFiche', async () => {
    mockLocation.state = {
      clientData: { id: null, libelle: 'X', identifie: false, descriptionPhysique: 'X' },
    }
    mockCreateClient.mockResolvedValueOnce(null)  // pas d'id

    renderPage()

    const rgm = screen.getAllByPlaceholderText('0 €')[0]
    await userEvent.type(rgm, '1000')
    await userEvent.type(screen.getAllByRole('textbox')[0], 'S1')
    await userEvent.click(screen.getByRole('button', { name: 'MAS' }))

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer la fiche/ }))

    expect(await screen.findByText(/Impossible de créer le client/)).toBeInTheDocument()
    expect(mockCreateFiche).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Erreur backend
  // -------------------------------------------------------------------------

  it('createFiche échoue : message du mapper affiché tel quel', async () => {
    mockCreateFiche.mockRejectedValueOnce(new Error('Une fiche existe déjà pour ce client aujourd\'hui'))

    renderPage()
    const rgm = screen.getAllByPlaceholderText('0 €')[0]
    await userEvent.type(rgm, '1000')
    await userEvent.type(screen.getAllByRole('textbox')[0], 'S1')
    await userEvent.click(screen.getByRole('button', { name: 'MAS' }))

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer la fiche/ }))

    expect(await screen.findByText(/Une fiche existe déjà/)).toBeInTheDocument()
    expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('existe déjà'), 'error')
  })
})
