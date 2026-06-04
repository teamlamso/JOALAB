import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mocks AVANT l'import du composant.
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockLogin = vi.fn()
vi.mock('../../api/auth.js', () => ({
  login: (...args) => mockLogin(...args),
  logout: vi.fn(),
}))

const mockSignIn = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ signIn: mockSignIn, user: null, signOut: vi.fn() }),
}))

import Login from '../Login.jsx'

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>)
}

describe('Login', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogin.mockReset()
    mockSignIn.mockReset()
  })

  it('affiche les champs identifiant et mot de passe', () => {
    renderLogin()
    expect(screen.getByLabelText(/Identifiant/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Mot de passe/)).toBeInTheDocument()
  })

  it('login OK : appelle signIn et redirige vers /accueil', async () => {
    mockLogin.mockResolvedValueOnce({ token: 'tk', id: 1, identifiant: 'mcd1', role: 'MCD' })

    renderLogin()
    await userEvent.type(screen.getByLabelText(/Identifiant/), 'mcd1')
    await userEvent.type(screen.getByLabelText(/Mot de passe/), 'password')
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/ }))

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledOnce())
    expect(mockSignIn).toHaveBeenCalledWith(expect.objectContaining({ token: 'tk' }))
    expect(mockNavigate).toHaveBeenCalledWith('/accueil')
  })

  it('login KO : affiche message d\'erreur, pas de redirection', async () => {
    mockLogin.mockRejectedValueOnce(new Error('401'))

    renderLogin()
    await userEvent.type(screen.getByLabelText(/Identifiant/), 'bad')
    await userEvent.type(screen.getByLabelText(/Mot de passe/), 'bad')
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/ }))

    await screen.findByText(/incorrect/)
    expect(mockSignIn).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('bouton désactivé pendant la requête', async () => {
    let resolve
    mockLogin.mockReturnValue(new Promise((r) => { resolve = r }))

    renderLogin()
    await userEvent.type(screen.getByLabelText(/Identifiant/), 'a')
    await userEvent.type(screen.getByLabelText(/Mot de passe/), 'b')
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/ }))

    const btn = screen.getByRole('button', { name: /Connexion…/ })
    expect(btn).toBeDisabled()

    resolve({ token: 'x' })
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })
})
