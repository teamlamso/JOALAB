import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks AVANT l'import du composant.
// ---------------------------------------------------------------------------

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
const mockMatchClient = vi.fn()
const mockUpdateClient = vi.fn()
vi.mock('../../api/clients.js', () => ({
  createClient: (...a) => mockCreateClient(...a),
  matchClient: (...a) => mockMatchClient(...a),
  updateClient: (...a) => mockUpdateClient(...a),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

// On stube tous les composants externes pour rester focalisé sur la logique
// de matching/fusion/forçage de NouveauClient.
vi.mock('../../components/DateInput.jsx', () => ({
  default: ({ value, onChange }) => (
    <input data-testid="date-input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}))
vi.mock('../../components/AddressSearch.jsx', () => ({ default: () => null }))
vi.mock('../../components/PlaceSearch.jsx', () => ({
  default: ({ value, onChange }) => (
    <input data-testid="lieu" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}))
vi.mock('../../components/CountrySearch.jsx', () => ({ default: () => null }))
vi.mock('../../components/PrefectureSearch.jsx', () => ({ default: () => null }))

// Stub minimal de la modale : on rend juste les boutons d'action pour piloter
// le flow depuis le test, sans dépendre de la mise en forme.
vi.mock('../../components/ClientMatchDialog.jsx', () => ({
  default: ({ candidates, onMerge, onContinue, onCancel }) => (
    <div data-testid="match-dialog">
      <ul>
        {candidates.map((c) => (
          <li key={c.id}>
            <span>{c.libelle ?? `${c.prenom} ${c.nom}`}</span>
            <button type="button" onClick={() => onMerge(c)}>Fusionner #{c.id}</button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onContinue}>Créer quand même</button>
      <button type="button" onClick={onCancel}>Annuler</button>
    </div>
  ),
}))

import NouveauClient from '../NouveauClient.jsx'

function fieldByLabel(label) {
  const labelEl = screen.getByText(label)
  return labelEl.closest('.form-group').querySelector('input, textarea, select')
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<NouveauClient />} />
      </Routes>
    </MemoryRouter>
  )
}

async function remplirIdentite() {
  await userEvent.type(fieldByLabel(/^Nom\s*:/), 'Durand')
  await userEvent.type(fieldByLabel(/^Prénom\s*:/), 'Paul')
}

describe('NouveauClient', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockCreateClient.mockReset()
    mockMatchClient.mockReset()
    mockUpdateClient.mockReset()
    mockNotify.mockReset()
    mockLocation.state = null
  })

  // -------------------------------------------------------------------------
  // Submit sans doublon : matchClient → [] → createClient → redirection
  // -------------------------------------------------------------------------

  it('aucun doublon → crée le client et redirige vers /clients/{id}', async () => {
    mockMatchClient.mockResolvedValueOnce([])
    mockCreateClient.mockResolvedValueOnce({ id: 42 })

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(mockCreateClient).toHaveBeenCalledOnce())
    expect(mockMatchClient).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith('/clients/42', { replace: true })
    expect(mockNotify).toHaveBeenCalledWith('Client créé', 'success')
  })

  it('createClient envoie identifie=true (le formulaire est toujours en mode identifié)', async () => {
    mockMatchClient.mockResolvedValueOnce([])
    mockCreateClient.mockResolvedValueOnce({ id: 1 })

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(mockCreateClient).toHaveBeenCalled())
    expect(mockCreateClient.mock.calls[0][0]).toMatchObject({
      identifie: true,
      nom: 'Durand',
      prenom: 'Paul',
    })
  })

  // -------------------------------------------------------------------------
  // Submit avec doublon : matchClient → [c] → modale → 3 actions possibles
  // -------------------------------------------------------------------------

  it('un doublon détecté → ouvre la modale et NE crée PAS le client', async () => {
    mockMatchClient.mockResolvedValueOnce([{ id: 7, libelle: 'P. Durand' }])

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(await screen.findByTestId('match-dialog')).toBeInTheDocument()
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('action Fusionner : updateClient sur le candidat puis redirection', async () => {
    mockMatchClient.mockResolvedValueOnce([{ id: 7, libelle: 'P. Durand' }])
    mockUpdateClient.mockResolvedValueOnce(undefined)

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await userEvent.click(await screen.findByRole('button', { name: /Fusionner #7/ }))

    await waitFor(() => expect(mockUpdateClient).toHaveBeenCalledOnce())
    expect(mockUpdateClient).toHaveBeenCalledWith(7, expect.objectContaining({
      identifie: true,
      nom: 'Durand',
      prenom: 'Paul',
    }))
    expect(mockNavigate).toHaveBeenCalledWith('/clients/7', { replace: true })
    expect(mockNotify).toHaveBeenCalledWith('Client mis à jour', 'success')
  })

  it('action « Créer quand même » : appelle createClient malgré le doublon', async () => {
    mockMatchClient.mockResolvedValueOnce([{ id: 7, libelle: 'P. Durand' }])
    mockCreateClient.mockResolvedValueOnce({ id: 99 })

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await userEvent.click(await screen.findByRole('button', { name: /Créer quand même/ }))

    await waitFor(() => expect(mockCreateClient).toHaveBeenCalledOnce())
    expect(mockUpdateClient).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/clients/99', { replace: true })
  })

  it('action Annuler : ferme la modale sans rien créer', async () => {
    mockMatchClient.mockResolvedValueOnce([{ id: 7, libelle: 'P. Durand' }])

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await userEvent.click(await screen.findByRole('button', { name: /Annuler/ }))

    expect(screen.queryByTestId('match-dialog')).not.toBeInTheDocument()
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockUpdateClient).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Erreurs
  // -------------------------------------------------------------------------

  it('matchClient en erreur → affiche le message et n\'appelle pas create', async () => {
    mockMatchClient.mockRejectedValueOnce(new Error('Bad Request'))

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(await screen.findByText(/Bad Request/)).toBeInTheDocument()
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Bad Request'), 'error')
  })

  it('createClient en erreur après fusion : reste sur la page avec l\'erreur', async () => {
    mockMatchClient.mockResolvedValueOnce([])
    mockCreateClient.mockRejectedValueOnce(new Error('Erreur serveur'))

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(await screen.findByText(/Erreur serveur/)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('createClient sans id retourné : remonte une erreur', async () => {
    // Garde-fou : si le backend renvoie 201 sans body ni Location utilisable,
    // request() renvoie null — on doit refuser plutôt que de naviguer vers /clients/null.
    mockMatchClient.mockResolvedValueOnce([])
    mockCreateClient.mockResolvedValueOnce(null)

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(await screen.findByText(/Impossible de créer le client/)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // returnTo = 'fiche' (création depuis le flow d'identification d'une fiche)
  // -------------------------------------------------------------------------

  it('returnTo=fiche : redirige vers /fiches/identification avec preselectClient', async () => {
    mockLocation.state = { returnTo: 'fiche' }
    mockMatchClient.mockResolvedValueOnce([])
    mockCreateClient.mockResolvedValueOnce({ id: 55 })

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
    expect(mockNavigate).toHaveBeenCalledWith(
      '/fiches/identification',
      expect.objectContaining({
        state: expect.objectContaining({
          preselectClient: expect.objectContaining({ id: 55 }),
        }),
        replace: true,
      })
    )
  })

  // -------------------------------------------------------------------------
  // État de chargement
  // -------------------------------------------------------------------------

  it('le bouton Enregistrer est désactivé pendant l\'appel matchClient', async () => {
    let resolve
    mockMatchClient.mockReturnValue(new Promise((r) => { resolve = r }))

    renderPage()
    await remplirIdentite()
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(screen.getByRole('button', { name: /Enregistrement\.\.\./ })).toBeDisabled()

    resolve([])
    await waitFor(() => expect(mockMatchClient).toHaveBeenCalled())
  })

  it('le bouton Retour appelle navigate(-1) sans rien soumettre', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
    expect(mockMatchClient).not.toHaveBeenCalled()
  })
})
