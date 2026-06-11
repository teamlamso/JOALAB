import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockCreateUtilisateur = vi.fn()
vi.mock('../../api/utilisateurs.js', () => ({
  createUtilisateur: (...a) => mockCreateUtilisateur(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

import NouveauUtilisateur from '../NouveauUtilisateur.jsx'

function fieldByLabel(label) {
  const labels = screen.getAllByText(label).filter((el) => el.tagName === 'LABEL')
  return labels[0].closest('.form-group').querySelector('input, select')
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes><Route path="*" element={<NouveauUtilisateur />} /></Routes>
    </MemoryRouter>
  )
}

describe('NouveauUtilisateur', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockCreateUtilisateur.mockReset()
    mockUseAuth.mockReset()
  })

  it('CAISSIER : redirige vers /accueil sans rendre le formulaire', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'CAISSIER' } })

    renderPage()

    await waitFor(() => expect(mockNavigate)
      .toHaveBeenCalledWith('/accueil', { replace: true }))
  })

  it('RESPONSABLE_CAISSE : ne propose QUE le rôle CAISSIER', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'RESPONSABLE_CAISSE' } })

    renderPage()

    const select = fieldByLabel(/^Rôle\s*:/)
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(options).toEqual(['CAISSIER'])
  })

  it('MCD : propose les trois rôles', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })

    renderPage()

    const select = fieldByLabel(/^Rôle\s*:/)
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(options).toEqual(['CAISSIER', 'RESPONSABLE_CAISSE', 'MCD'])
  })

  it('submit envoie le formulaire complet et redirige vers /utilisateurs', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockCreateUtilisateur.mockResolvedValueOnce({ id: 42 })

    renderPage()

    await userEvent.type(fieldByLabel(/^Identifiant\s*:/), 'jdupont')
    await userEvent.type(fieldByLabel(/^Mot de passe\s*:/), 'secret123')
    await userEvent.type(fieldByLabel(/^Nom\s*:/), 'Dupont')
    await userEvent.type(fieldByLabel(/^Prénom\s*:/), 'Jean')

    await userEvent.click(screen.getByRole('button', { name: /Créer l'utilisateur/ }))

    await waitFor(() => expect(mockCreateUtilisateur).toHaveBeenCalledOnce())
    expect(mockCreateUtilisateur).toHaveBeenCalledWith(expect.objectContaining({
      identifiant: 'jdupont',
      motDePasse: 'secret123',
      nom: 'Dupont',
      prenom: 'Jean',
      role: 'CAISSIER',
    }))
    expect(mockNavigate).toHaveBeenCalledWith('/utilisateurs')
  })

  it('erreur backend : reste sur la page avec le message', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })
    mockCreateUtilisateur.mockRejectedValueOnce(new Error('Identifiant déjà pris'))

    renderPage()
    await userEvent.type(fieldByLabel(/^Identifiant\s*:/), 'taken')
    await userEvent.type(fieldByLabel(/^Mot de passe\s*:/), 'p')
    await userEvent.type(fieldByLabel(/^Nom\s*:/), 'N')
    await userEvent.type(fieldByLabel(/^Prénom\s*:/), 'P')
    await userEvent.click(screen.getByRole('button', { name: /Créer l'utilisateur/ }))

    expect(await screen.findByText(/Identifiant déjà pris/)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalledWith('/utilisateurs')
  })

  it('bouton Retour → /utilisateurs', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })

    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/utilisateurs')
  })
})
