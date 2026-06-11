import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Header est un noeud lourd (lit le user, affiche menus) — on le neutralise pour
// pouvoir tester PrivateRoute de manière isolée.
vi.mock('../Header.jsx', () => ({
  default: () => <header data-testid="header-stub">Header</header>,
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

import PrivateRoute from '../PrivateRoute.jsx'

function renderTree(initialEntry = '/accueil') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<div data-testid="login-page">login</div>} />
        <Route element={<PrivateRoute />}>
          <Route path="/accueil" element={<div data-testid="accueil-page">accueil</div>} />
          <Route path="/clients" element={<div data-testid="clients-page">clients</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('PrivateRoute', () => {
  it('redirige vers / quand aucun user n\'est connecté', () => {
    mockUseAuth.mockReturnValue({ user: null })

    renderTree('/accueil')

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('accueil-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('header-stub')).not.toBeInTheDocument()
  })

  it('redirige aussi quand user est undefined (état de chargement non géré)', () => {
    // Garde-fou : on ne veut JAMAIS afficher une page protégée tant que useAuth
    // n'a pas renvoyé un user explicite. Une auth « pending » doit renvoyer
    // vers /, charge à l'AuthContext de mémoriser le state via localStorage.
    mockUseAuth.mockReturnValue({ user: undefined })

    renderTree('/clients')

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('rend Header + Outlet quand un user est connecté', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'MCD' } })

    renderTree('/accueil')

    expect(screen.getByTestId('header-stub')).toBeInTheDocument()
    expect(screen.getByTestId('accueil-page')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('laisse passer un CAISSIER sur une route protégée', () => {
    // PrivateRoute n'est qu'une garde « est connecté » — le filtrage par rôle
    // se fait au niveau de chaque page.
    mockUseAuth.mockReturnValue({ user: { id: 2, role: 'CAISSIER' } })

    renderTree('/clients')

    expect(screen.getByTestId('clients-page')).toBeInTheDocument()
  })
})
