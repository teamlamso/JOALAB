import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../assets/logoJOA.svg', () => ({ default: 'logo.svg' }))

import Header from '../Header.jsx'

function renderHeader() {
  return render(<MemoryRouter><Header /></MemoryRouter>)
}

describe('Header', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUseAuth.mockReset()
  })

  it('sans utilisateur connecté : juste logo + titre, pas de menu', () => {
    mockUseAuth.mockReturnValue({ user: null, signOut: vi.fn() })

    renderHeader()

    expect(screen.getByText('JOA LAB-FT')).toBeInTheDocument()
    expect(screen.queryByText(/MCD|Caissier|Responsable/)).not.toBeInTheDocument()
  })

  it('affiche le rôle formaté et le nom complet (prénom + NOM en capitales)', () => {
    mockUseAuth.mockReturnValue({
      user: { prenom: 'Jean', nom: 'Dupont', role: 'RESPONSABLE_CAISSE' },
      signOut: vi.fn(),
    })

    renderHeader()

    expect(screen.getByText('Responsable caisse')).toBeInTheDocument()
    // formatLibelle renvoie « Jean DUPONT » — vérifié par utils/libelle.
    expect(screen.getByText(/Jean DUPONT/)).toBeInTheDocument()
  })

  it('menu fermé par défaut, ouvert au clic', async () => {
    mockUseAuth.mockReturnValue({
      user: { prenom: 'J', nom: 'D', role: 'MCD' },
      signOut: vi.fn(),
    })

    renderHeader()

    expect(screen.queryByRole('button', { name: /Se déconnecter/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('MCD'))

    expect(screen.getByRole('button', { name: /Se déconnecter/ })).toBeInTheDocument()
  })

  it('CAISSIER : seulement « Se déconnecter » dans le menu', async () => {
    mockUseAuth.mockReturnValue({
      user: { prenom: 'J', nom: 'D', role: 'CAISSIER' },
      signOut: vi.fn(),
    })

    renderHeader()
    await userEvent.click(screen.getByText('Caissier'))

    expect(screen.queryByRole('button', { name: /Utilisateurs/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Importer/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Journal/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Se déconnecter/ })).toBeInTheDocument()
  })

  it('RESPONSABLE_CAISSE : Utilisateurs et Import, pas Journal', async () => {
    mockUseAuth.mockReturnValue({
      user: { prenom: 'J', nom: 'D', role: 'RESPONSABLE_CAISSE' },
      signOut: vi.fn(),
    })

    renderHeader()
    await userEvent.click(screen.getByText('Responsable caisse'))

    expect(screen.getByRole('button', { name: 'Utilisateurs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importer des clients/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Journal/ })).not.toBeInTheDocument()
  })

  it('MCD : les trois entrées admin + déconnexion', async () => {
    mockUseAuth.mockReturnValue({
      user: { prenom: 'J', nom: 'D', role: 'MCD' },
      signOut: vi.fn(),
    })

    renderHeader()
    await userEvent.click(screen.getByText('MCD'))

    expect(screen.getByRole('button', { name: 'Utilisateurs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importer des clients/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Journal d'audit/ })).toBeInTheDocument()
  })

  it('clic sur « Utilisateurs » : navigue vers /utilisateurs', async () => {
    mockUseAuth.mockReturnValue({
      user: { prenom: 'J', nom: 'D', role: 'MCD' },
      signOut: vi.fn(),
    })

    renderHeader()
    await userEvent.click(screen.getByText('MCD'))
    await userEvent.click(screen.getByRole('button', { name: 'Utilisateurs' }))

    expect(mockNavigate).toHaveBeenCalledWith('/utilisateurs')
  })

  it('« Se déconnecter » : appelle signOut puis navigate("/")', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({
      user: { prenom: 'J', nom: 'D', role: 'CAISSIER' },
      signOut,
    })

    renderHeader()
    await userEvent.click(screen.getByText('Caissier'))
    await userEvent.click(screen.getByRole('button', { name: /Se déconnecter/ }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('clic en dehors du menu : le referme', async () => {
    mockUseAuth.mockReturnValue({
      user: { prenom: 'J', nom: 'D', role: 'MCD' },
      signOut: vi.fn(),
    })

    renderHeader()
    await userEvent.click(screen.getByText('MCD'))
    expect(screen.getByRole('button', { name: 'Utilisateurs' })).toBeInTheDocument()

    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(screen.queryByRole('button', { name: 'Utilisateurs' })).not.toBeInTheDocument()
  })
})
