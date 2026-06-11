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

const mockGetFiche = vi.fn()
const mockUpdateFiche = vi.fn()
vi.mock('../../api/fiches.js', () => ({
  getFiche: (...a) => mockGetFiche(...a),
  updateFiche: (...a) => mockUpdateFiche(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

// ConfirmDialog est testé séparément — on le stube pour valider directement.
vi.mock('../../components/ConfirmDialog.jsx', () => ({
  default: ({ open, onConfirm, onCancel }) =>
    open
      ? <div data-testid="confirm">
          <button onClick={onConfirm}>OK</button>
          <button onClick={onCancel}>Annuler</button>
        </div>
      : null,
}))

import EditFiche from '../EditFiche.jsx'

const ficheBase = {
  id: 7,
  date: '2026-06-10',
  client: { libelle: 'Dupont M.' },
  clientPpe: false,
  lignes: [
    {
      id: 100, typeJeu: 'MAS', typePaiement: 'ESPECE', typeChange: null,
      numeroSocle: 'S1', montantRGM: 1000, changeEntrant: null, changeSortant: null,
      observations: '', enregistreFrontCage: false, enregistreFrontCageEntrant: false,
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<EditFiche />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EditFiche', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGetFiche.mockReset()
    mockUpdateFiche.mockReset()
    mockUseAuth.mockReset()
    mockNotify.mockReset()
    // On garde la vraie horloge — fake timers couperaient userEvent. Les
    // tests basés sur peutModifierFiche utilisent des dates volontairement
    // hors fenêtre (« 2026-01-01 ») pour rester déterministes même quelques
    // jours plus tard.
  })

  // -------------------------------------------------------------------------
  // États initiaux et permissions
  // -------------------------------------------------------------------------

  it('affiche « Chargement… » tant que getFiche n\'a pas répondu', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockReturnValue(new Promise(() => {}))

    renderPage()
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche l\'erreur si getFiche échoue', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockRejectedValueOnce(new Error('Fiche introuvable'))

    renderPage()
    expect(await screen.findByText(/Fiche introuvable/)).toBeInTheDocument()
  })

  it('CAISSIER sur une fiche trop ancienne : redirige vers le détail (consultation)', async () => {
    // La garde côté UI évite que le caissier édite une fiche qu'il ne pourrait
    // de toute façon pas sauvegarder (le backend rejetterait au PUT).
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetFiche.mockResolvedValueOnce({ ...ficheBase, date: '2026-01-01' })

    renderPage()

    await waitFor(() => expect(mockNavigate)
      .toHaveBeenCalledWith('/fiches/7', { replace: true }))
    expect(mockNotify).toHaveBeenCalledWith(
      expect.stringContaining("n'avez pas le droit"),
      'warning'
    )
  })

  it('charge la fiche et rend le libellé du client', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()

    expect(await screen.findByText(/Dupont M\./)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Ajout / suppression de lignes
  // -------------------------------------------------------------------------

  it('« Ajouter une ligne » empile une nouvelle ligne', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()

    await screen.findByText(/Dupont M\./)
    const avant = screen.getAllByText(/Montant Online/).length
    await userEvent.click(screen.getByRole('button', { name: /Ajouter une ligne/ }))

    expect(screen.getAllByText(/Montant Online/).length).toBe(avant + 1)
  })

  it('le bouton « Supprimer la ligne » est grisé quand il ne reste qu\'une ligne', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()
    await screen.findByText(/Dupont M\./)

    // Une seule ligne → la corbeille est disabled (canRemove=false).
    const corbeilles = screen.getAllByTitle(/Supprimer la ligne/)
    expect(corbeilles[0]).toBeDisabled()
  })

  it('la suppression demande confirmation puis retire la ligne', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce({
      ...ficheBase,
      lignes: [ficheBase.lignes[0], { ...ficheBase.lignes[0], id: 101 }],
    })

    renderPage()
    await screen.findByText(/Dupont M\./)

    // Deux lignes → les deux corbeilles sont actives.
    const corbeilles = screen.getAllByTitle(/Supprimer la ligne/)
    expect(corbeilles[0]).not.toBeDisabled()

    await userEvent.click(corbeilles[0])
    expect(screen.getByTestId('confirm')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(screen.queryByTestId('confirm')).not.toBeInTheDocument()
    expect(screen.getAllByText(/Montant Online/).length).toBe(1)
  })

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it('refuse de soumettre une ligne sans aucun montant', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    // Fiche vide → une ligne neuve, sans rien.
    mockGetFiche.mockResolvedValueOnce({ ...ficheBase, lignes: [] })

    renderPage()
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /Mettre à jour la fiche/ }))

    expect(await screen.findByText(/au moins un montant/i)).toBeInTheDocument()
    expect(mockUpdateFiche).not.toHaveBeenCalled()
  })

  it('refuse RGM sans numéro de socle', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce({
      ...ficheBase,
      lignes: [{ ...ficheBase.lignes[0], numeroSocle: '', montantRGM: 1000 }],
    })

    renderPage()
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /Mettre à jour la fiche/ }))

    expect(await screen.findByText(/numéro de socle est obligatoire/i)).toBeInTheDocument()
  })

  it('refuse change entrant/sortant sans observation', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce({
      ...ficheBase,
      lignes: [{
        ...ficheBase.lignes[0],
        montantRGM: null, numeroSocle: '', typeJeu: 'MAS', typePaiement: 'ESPECE',
        changeEntrant: 200, observations: '',
      }],
    })

    renderPage()
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /Mettre à jour la fiche/ }))

    expect(await screen.findByText(/observation est obligatoire/i)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Submit nominal : payload + navigate(-1)
  // -------------------------------------------------------------------------

  it('submit OK : POST le payload nettoyé puis navigate(-1)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)
    mockUpdateFiche.mockResolvedValueOnce(undefined)

    renderPage()
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /Mettre à jour la fiche/ }))

    await waitFor(() => expect(mockUpdateFiche).toHaveBeenCalledOnce())
    const [id, payload] = mockUpdateFiche.mock.calls[0]
    expect(id).toBe('7')
    expect(payload.lignes).toHaveLength(1)
    expect(payload.lignes[0]).toMatchObject({
      id: 100,
      typeJeu: 'MAS',
      typePaiement: 'ESPECE',
      numeroSocle: 'S1',
      montantRGM: 1000,
    })
    expect(mockNotify).toHaveBeenCalledWith('Fiche mise à jour', 'success')
    // Fix navigate(-1) : un seul Retour pour revenir sur DetailFiche au lieu
    // de deux (l'historique avait DetailFiche → EditFiche → DetailFiche).
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('ajouter une ligne vide fait échouer la validation (les vides ne sont pas tolérées hors PPE)', async () => {
    // Garde-fou : un click malencontreux sur « Ajouter une ligne » ne doit pas
    // pouvoir polluer la fiche d'une ligne fantôme. On force l'utilisateur à
    // soit la remplir, soit la supprimer.
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /Ajouter une ligne/ }))
    await userEvent.click(screen.getByRole('button', { name: /Mettre à jour la fiche/ }))

    expect(await screen.findByText(/Ligne 2 : au moins un montant/i)).toBeInTheDocument()
    expect(mockUpdateFiche).not.toHaveBeenCalled()
  })

  it('client PPE : autorise un submit avec uniquement des lignes vides', async () => {
    // Pour une fiche PPE, on peut explicitement déclarer « rien à signaler »
    // (toutes les lignes vides). La validation s'efface.
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce({ ...ficheBase, clientPpe: true, lignes: [] })
    mockUpdateFiche.mockResolvedValueOnce(undefined)

    renderPage()
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /Mettre à jour la fiche/ }))

    await waitFor(() => expect(mockUpdateFiche).toHaveBeenCalledOnce())
    expect(mockUpdateFiche.mock.calls[0][1].lignes).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Contrat avec GlobalExceptionMapper
  // -------------------------------------------------------------------------

  it('affiche le message d\'erreur du backend tel quel et ne navigue pas', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)
    mockUpdateFiche.mockRejectedValueOnce(new Error('Fiche verrouillée par le MCD'))

    renderPage()
    await screen.findByText(/Dupont M\./)

    await userEvent.click(screen.getByRole('button', { name: /Mettre à jour la fiche/ }))

    expect(await screen.findByText(/Fiche verrouillée par le MCD/)).toBeInTheDocument()
    expect(mockNotify).toHaveBeenCalledWith(
      expect.stringContaining('Fiche verrouillée par le MCD'),
      'error'
    )
    expect(mockNavigate).not.toHaveBeenCalledWith(-1)
  })

  // -------------------------------------------------------------------------
  // Retour explicite
  // -------------------------------------------------------------------------

  it('bouton « Retour » → /fiches/{id} (vue détail), pas navigate(-1)', async () => {
    // C'est volontaire : si l'utilisateur n'a rien sauvé, on bascule sur la
    // page de consultation au lieu de remonter l'historique — ça évite de
    // retomber sur une page de saisie potentiellement préfixée.
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetFiche.mockResolvedValueOnce(ficheBase)

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/fiches/7')
    expect(mockUpdateFiche).not.toHaveBeenCalled()
  })
})
