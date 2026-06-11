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
    useParams: () => ({ id: '5' }),
  }
})

const mockListUtilisateurs = vi.fn()
const mockUpdateUtilisateur = vi.fn()
vi.mock('../../api/utilisateurs.js', () => ({
  listUtilisateurs: (...a) => mockListUtilisateurs(...a),
  updateUtilisateur: (...a) => mockUpdateUtilisateur(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

import EditUtilisateur from '../EditUtilisateur.jsx'

function fieldByLabel(label) {
  // « Identifiant : » apparaît aussi comme section-title — on filtre sur les
  // <label> seulement (les section-titles sont des <div>).
  const labels = screen.getAllByText(label).filter((el) => el.tagName === 'LABEL')
  return labels[0].closest('.form-group').querySelector('input, select')
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes><Route path="*" element={<EditUtilisateur />} /></Routes>
    </MemoryRouter>
  )
}

const utilisateurBase = {
  id: 5, identifiant: 'caissier5', nom: 'Doe', prenom: 'Jane', role: 'CAISSIER', archive: false,
}

describe('EditUtilisateur', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockListUtilisateurs.mockReset()
    mockUpdateUtilisateur.mockReset()
    mockUseAuth.mockReset()
    mockNotify.mockReset()
    mockLocation.state = null
  })

  // -------------------------------------------------------------------------
  // Garde-fou : seulement MCD
  // -------------------------------------------------------------------------

  it('CAISSIER : redirige vers /accueil sans rien charger', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 99, role: 'CAISSIER' } })
    mockListUtilisateurs.mockResolvedValueOnce([utilisateurBase])

    renderPage()

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/accueil', { replace: true })
    )
  })

  it('RESPONSABLE_CAISSE : aussi redirigé (modification utilisateur = MCD only)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 99, role: 'RESPONSABLE_CAISSE' } })
    mockListUtilisateurs.mockResolvedValueOnce([utilisateurBase])

    renderPage()

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/accueil', { replace: true })
    )
  })

  // -------------------------------------------------------------------------
  // Hydratation depuis location.state vs depuis listUtilisateurs
  // -------------------------------------------------------------------------

  it('utilise location.state.utilisateur si fourni (skip listUtilisateurs)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockLocation.state = { utilisateur: utilisateurBase }

    renderPage()

    expect(await screen.findByDisplayValue('caissier5')).toBeInTheDocument()
    expect(mockListUtilisateurs).not.toHaveBeenCalled()
  })

  it('sans state : fetch listUtilisateurs et filtre par id', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce([
      { id: 4, identifiant: 'autre', nom: 'X', prenom: 'Y', role: 'MCD' },
      utilisateurBase,
    ])

    renderPage()

    expect(await screen.findByDisplayValue('caissier5')).toBeInTheDocument()
    expect(mockListUtilisateurs).toHaveBeenCalledWith({ includeArchives: true })
  })

  it('utilisateur introuvable : affiche le message d\'erreur', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockListUtilisateurs.mockResolvedValueOnce([])  // pas d'id 5

    renderPage()

    expect(await screen.findByText(/Utilisateur introuvable/)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Submit : PATCH partiel (diff)
  // -------------------------------------------------------------------------

  it('submit sans changement : notif « Aucune modification » sans PATCH', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockLocation.state = { utilisateur: utilisateurBase }

    renderPage()
    await screen.findByDisplayValue('caissier5')

    await userEvent.click(screen.getByRole('button', { name: /^Enregistrer/ }))

    expect(mockNotify).toHaveBeenCalledWith('Aucune modification', 'info')
    expect(mockUpdateUtilisateur).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/utilisateurs')
  })

  it('submit envoie UNIQUEMENT les champs modifiés (PATCH diff)', async () => {
    // Le backend distingue null (pas de changement) d'une valeur explicite.
    // Si on renvoie tout le formulaire, on écrase aussi des champs intacts —
    // ce qui peut effacer la date de dernière modif et logger des changements
    // fictifs dans le journal d'audit.
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockLocation.state = { utilisateur: utilisateurBase }
    mockUpdateUtilisateur.mockResolvedValueOnce(undefined)

    renderPage()
    await screen.findByDisplayValue('caissier5')

    const nom = fieldByLabel(/^Nom\s*:/)
    await userEvent.clear(nom)
    await userEvent.type(nom, 'Smith')

    await userEvent.click(screen.getByRole('button', { name: /^Enregistrer/ }))

    await waitFor(() => expect(mockUpdateUtilisateur).toHaveBeenCalledOnce())
    expect(mockUpdateUtilisateur).toHaveBeenCalledWith('5', { nom: 'Smith' })
  })

  it('change le rôle via le select et l\'envoie au backend', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockLocation.state = { utilisateur: utilisateurBase }
    mockUpdateUtilisateur.mockResolvedValueOnce(undefined)

    renderPage()
    await screen.findByDisplayValue('caissier5')

    const role = fieldByLabel(/^Rôle\s*:/)
    await userEvent.selectOptions(role, 'RESPONSABLE_CAISSE')

    await userEvent.click(screen.getByRole('button', { name: /^Enregistrer/ }))

    await waitFor(() => expect(mockUpdateUtilisateur).toHaveBeenCalled())
    expect(mockUpdateUtilisateur).toHaveBeenCalledWith('5', { role: 'RESPONSABLE_CAISSE' })
  })

  it('après succès : notif + redirect /utilisateurs', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockLocation.state = { utilisateur: utilisateurBase }
    mockUpdateUtilisateur.mockResolvedValueOnce(undefined)

    renderPage()
    await screen.findByDisplayValue('caissier5')

    const id = fieldByLabel(/^Identifiant\s*:/)
    await userEvent.clear(id)
    await userEvent.type(id, 'caissier5-renamed')

    await userEvent.click(screen.getByRole('button', { name: /^Enregistrer/ }))

    await waitFor(() => expect(mockNotify)
      .toHaveBeenCalledWith('Utilisateur mis à jour', 'success'))
    expect(mockNavigate).toHaveBeenCalledWith('/utilisateurs')
  })

  it('erreur backend remonte le message tel quel', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockLocation.state = { utilisateur: utilisateurBase }
    mockUpdateUtilisateur.mockRejectedValueOnce(new Error('Identifiant déjà utilisé'))

    renderPage()
    await screen.findByDisplayValue('caissier5')

    const id = fieldByLabel(/^Identifiant\s*:/)
    await userEvent.clear(id)
    await userEvent.type(id, 'taken')

    await userEvent.click(screen.getByRole('button', { name: /^Enregistrer/ }))

    expect(await screen.findByText(/Identifiant déjà utilisé/)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalledWith('/utilisateurs')
  })

  // -------------------------------------------------------------------------
  // Compte archivé : tout verrouillé
  // -------------------------------------------------------------------------

  it('compte archivé : champs et bouton Enregistrer désactivés, bannière visible', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockLocation.state = { utilisateur: { ...utilisateurBase, archive: true } }

    renderPage()
    await screen.findByDisplayValue('caissier5')

    expect(screen.getByText(/Ce compte est archivé/)).toBeInTheDocument()
    expect(fieldByLabel(/^Identifiant\s*:/)).toBeDisabled()
    expect(fieldByLabel(/^Nom\s*:/)).toBeDisabled()
    expect(fieldByLabel(/^Prénom\s*:/)).toBeDisabled()
    expect(fieldByLabel(/^Rôle\s*:/)).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Enregistrer/ })).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Garde-fou auto-rétrogradation
  // -------------------------------------------------------------------------

  it('utilisateur courant rétrogradant son propre rôle MCD : affiche un avertissement', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 5, role: 'MCD' } })
    mockLocation.state = { utilisateur: { ...utilisateurBase, role: 'MCD' } }

    renderPage()
    await screen.findByDisplayValue('caissier5')

    const role = fieldByLabel(/^Rôle\s*:/)
    await userEvent.selectOptions(role, 'CAISSIER')

    expect(screen.getByText(/Vous ne pouvez pas vous retirer/)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Retour
  // -------------------------------------------------------------------------

  it('bouton Retour → /utilisateurs', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockLocation.state = { utilisateur: utilisateurBase }

    renderPage()
    await screen.findByDisplayValue('caissier5')

    await userEvent.click(screen.getByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/utilisateurs')
  })
})
