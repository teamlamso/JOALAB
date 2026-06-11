import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks AVANT l'import du composant.
//
// On stube les composants externes (DateInput est testé à part, AddressSearch
// et consorts dépendent de l'API d'adresses) pour pouvoir piloter le test
// uniquement par la valeur du champ, sans setup réseau.
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn()
const mockLocation = { state: null }
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => ({ id: '10' }),
  }
})

const mockGetClient = vi.fn()
const mockUpdateClient = vi.fn()
const mockUpdateClientIdentification = vi.fn()
vi.mock('../../api/clients.js', () => ({
  getClient: (...a) => mockGetClient(...a),
  updateClient: (...a) => mockUpdateClient(...a),
  updateClientIdentification: (...a) => mockUpdateClientIdentification(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

// Inputs simples pour les autocomplete : value + onChange via un <input>
// classique, pour que userEvent.type fonctionne sans simuler de debounce.
vi.mock('../../components/DateInput.jsx', () => ({
  default: ({ value, onChange, disabled }) => (
    <input
      data-testid="date-input"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  ),
}))
vi.mock('../../components/AddressSearch.jsx', () => ({
  default: ({ onSelect }) => (
    <button type="button" data-testid="addr-pick" onClick={() =>
      onSelect({ rue: '1 rue X', codePostal: '75001', ville: 'Paris', pays: 'France' })
    }>pick</button>
  ),
}))
vi.mock('../../components/PlaceSearch.jsx', () => ({
  default: ({ value, onChange, disabled }) => (
    <input
      data-testid="lieu-naissance"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  ),
}))
vi.mock('../../components/CountrySearch.jsx', () => ({
  default: ({ value, onChange }) => (
    <input data-testid={`country-${value || 'empty'}`} value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}))
vi.mock('../../components/PrefectureSearch.jsx', () => ({
  default: ({ value, onChange }) => (
    <input data-testid="prefecture" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}))

import EditClient from '../EditClient.jsx'

// Helper : les <label> du formulaire ne sont pas associés par `htmlFor` —
// on remonte au form-group parent et on en extrait le contrôle (input,
// textarea ou select).
function fieldByLabel(label) {
  const labelEl = screen.getByText(label)
  const group = labelEl.closest('.form-group')
  return group.querySelector('input, textarea, select')
}

// ---------------------------------------------------------------------------

const clientBase = {
  id: 10,
  identifie: true,
  nom: 'Dupont',
  prenom: 'Marie',
  dateNaissance: '1980-01-01',
  lieuNaissance: 'Lyon (69)',
  ppe: false,
  rue: '1 rue de la Paix',
  complement: '',
  codePostal: '75002',
  ville: 'Paris',
  pays: 'France',
  typePiece: 'CNI',
  numeroPiece: 'ABC',
  dateDelivrance: '2020-01-01',
  prefectureDelivrance: 'Paris',
  paysDelivrance: '',
  descriptionPhysique: '',
  champsManquants: [],
}

function renderEdit() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<EditClient />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EditClient', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGetClient.mockReset()
    mockUpdateClient.mockReset()
    mockUpdateClientIdentification.mockReset()
    mockUseAuth.mockReset()
    mockNotify.mockReset()
    mockLocation.state = null
  })

  it('affiche « Chargement… » tant que getClient est en cours', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockReturnValue(new Promise(() => {}))

    renderEdit()

    expect(screen.getByText(/Chargement…/)).toBeInTheDocument()
  })

  it('affiche l\'erreur si getClient échoue et n\'affiche pas le formulaire', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockRejectedValueOnce(new Error('Client introuvable'))

    renderEdit()

    expect(await screen.findByText(/Client introuvable/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // MCD : édition complète → updateClient
  // -------------------------------------------------------------------------

  it('MCD : envoie le formulaire complet via updateClient et revient en arrière', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)
    mockUpdateClient.mockResolvedValueOnce(undefined)

    renderEdit()

    await screen.findByRole('button', { name: /Enregistrer/ })
    const nom = fieldByLabel(/^Nom\s*:/)
    await userEvent.clear(nom)
    await userEvent.type(nom, 'Martin')

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(mockUpdateClient).toHaveBeenCalledOnce())
    expect(mockUpdateClient).toHaveBeenCalledWith('10', expect.objectContaining({
      identifie: true,
      nom: 'Martin',
      prenom: 'Marie',
    }))
    expect(mockUpdateClientIdentification).not.toHaveBeenCalled()
    expect(mockNotify).toHaveBeenCalledWith('Client mis à jour', 'success')
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('MCD : ne désactive ni nom/prénom, ni date, ni lieu, ni PPE', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })

    expect(fieldByLabel(/^Nom\s*:/)).not.toBeDisabled()
    expect(fieldByLabel(/^Prénom\s*:/)).not.toBeDisabled()
    expect(screen.getAllByTestId('date-input')[0]).not.toBeDisabled()
    expect(screen.getByTestId('lieu-naissance')).not.toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /PPE/ })).not.toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // CAISSIER : édition partielle → updateClientIdentification
  // -------------------------------------------------------------------------

  it('CAISSIER : affiche la bannière explicative et grise nom/prénom', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })

    expect(screen.getByText(/ne permet de modifier/i)).toBeInTheDocument()
    expect(fieldByLabel(/^Nom\s*:/)).toBeDisabled()
    expect(fieldByLabel(/^Prénom\s*:/)).toBeDisabled()
  })

  it('CAISSIER : lieu de naissance reste ÉDITABLE (le backend remontera l\'erreur)', async () => {
    // C'est le cœur du fix récent : on ne grise plus le champ pour qu'un
    // CAISSIER puisse essayer et recevoir un message d'erreur clair en cas
    // de refus, plutôt que d'être face à un champ verrouillé sans explication.
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderEdit()

    expect(await screen.findByTestId('lieu-naissance')).not.toBeDisabled()
  })

  it('CAISSIER : date de naissance désactivée quand elle est déjà saisie', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })

    // EditClient rend deux DateInput : naissance + délivrance. On veut le
    // premier — celui de la date de naissance.
    const dates = screen.getAllByTestId('date-input')
    expect(dates[0]).toBeDisabled()
  })

  it('CAISSIER : date de naissance ÉDITABLE quand elle est absente', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce({ ...clientBase, dateNaissance: null })

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })

    const dates = screen.getAllByTestId('date-input')
    expect(dates[0]).not.toBeDisabled()
  })

  it('CAISSIER : appelle updateClientIdentification avec lieu+date sentinelles à null', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    // Client neuf, sans état civil rempli → tout est éditable et envoyé null
    // si l'utilisateur ne complète rien (différencier vide de "rien à dire").
    mockGetClient.mockResolvedValueOnce({
      ...clientBase, dateNaissance: null, lieuNaissance: null, ppe: false,
    })
    mockUpdateClientIdentification.mockResolvedValueOnce(undefined)

    renderEdit()

    await screen.findByRole('button', { name: /Enregistrer/ })
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(mockUpdateClientIdentification).toHaveBeenCalledOnce())
    const [, payload] = mockUpdateClientIdentification.mock.calls[0]
    expect(payload.lieuNaissance).toBeNull()
    expect(payload.dateNaissance).toBeNull()
    expect(payload.ppe).toBeNull()
  })

  it('CAISSIER : transmet ppe=true uniquement quand activé (jamais false)', async () => {
    // Le backend distingue ppe=null (pas de changement) de ppe=true (activation).
    // Un caissier ne doit jamais envoyer false — ce serait une tentative
    // illégitime de désactivation.
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce({ ...clientBase, ppe: false })
    mockUpdateClientIdentification.mockResolvedValueOnce(undefined)

    renderEdit()

    const checkbox = await screen.findByRole('checkbox', { name: /PPE/ })
    await userEvent.click(checkbox)
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(mockUpdateClientIdentification).toHaveBeenCalledOnce())
    expect(mockUpdateClientIdentification.mock.calls[0][1].ppe).toBe(true)
  })

  it('CAISSIER : ne peut pas désactiver le PPE déjà actif (checkbox grisée)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce({ ...clientBase, ppe: true })

    renderEdit()

    expect(await screen.findByRole('checkbox', { name: /PPE/ })).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Remontée d'erreur (contrat avec le GlobalExceptionMapper)
  // -------------------------------------------------------------------------

  it('affiche le message du backend tel quel quand le PUT échoue', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })
    mockGetClient.mockResolvedValueOnce(clientBase)
    // request() rejette avec le message extrait du body — c'est exactement
    // celui qu'on veut voir s'afficher en alerte ET dans la notif.
    mockUpdateClientIdentification.mockRejectedValueOnce(
      new Error('Votre rôle ne vous permet pas de modifier ce lieu de naissance.')
    )

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(await screen.findByText(/Votre rôle ne vous permet pas/))
      .toBeInTheDocument()
    expect(mockNotify).toHaveBeenCalledWith(
      expect.stringContaining('Votre rôle ne vous permet pas'),
      'error'
    )
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Navigation et returnTo
  // -------------------------------------------------------------------------

  it('navigate(-1) par défaut après succès', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)
    mockUpdateClient.mockResolvedValueOnce(undefined)

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(-1))
  })

  it('si location.state.returnTo est défini : redirige dessus avec replace', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)
    mockUpdateClient.mockResolvedValueOnce(undefined)
    mockLocation.state = { returnTo: '/fiches/42' }

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(mockNavigate)
      .toHaveBeenCalledWith('/fiches/42', { replace: true }))
  })

  it('le bouton « Retour » du header appelle navigate(-1) sans envoyer de PUT', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce(clientBase)

    renderEdit()
    await userEvent.click(await screen.findByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
    expect(mockUpdateClient).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Surlignage des champs manquants
  // -------------------------------------------------------------------------

  it('met la classe « champ-manquant » sur les champs listés par le backend', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce({
      ...clientBase,
      nom: '',
      champsManquants: ['nom'],
    })

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })

    const nom = fieldByLabel(/^Nom\s*:/)
    expect(nom.closest('.form-group')).toHaveClass('champ-manquant')
  })

  it('retire le surlignage dès qu\'on saisit le champ manquant', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce({
      ...clientBase,
      nom: '',
      champsManquants: ['nom'],
    })

    renderEdit()
    await screen.findByRole('button', { name: /Enregistrer/ })

    const nom = fieldByLabel(/^Nom\s*:/)
    await userEvent.type(nom, 'X')

    expect(nom.closest('.form-group')).not.toHaveClass('champ-manquant')
  })

  it('AddressSearch pré-remplit rue/CP/ville/pays quand on choisit une suggestion', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockGetClient.mockResolvedValueOnce({ ...clientBase, rue: '', codePostal: '', ville: '' })

    renderEdit()
    await userEvent.click(await screen.findByTestId('addr-pick'))

    expect(fieldByLabel(/^Rue\s*:/)).toHaveValue('1 rue X')
    expect(fieldByLabel(/^Code postal\s*:/)).toHaveValue('75001')
    expect(fieldByLabel(/^Ville\s*:/)).toHaveValue('Paris')
  })
})
