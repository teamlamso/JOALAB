import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockImportClients = vi.fn()
vi.mock('../../api/clients.js', () => ({
  importClients: (...a) => mockImportClients(...a),
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockNotify = vi.fn()
vi.mock('../../context/NotificationContext.jsx', () => ({
  useNotify: () => mockNotify,
}))

import ImporterClients from '../ImporterClients.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes><Route path="*" element={<ImporterClients />} /></Routes>
    </MemoryRouter>
  )
}

function fileInput() {
  // L'<input type="file"> n'a pas de role accessible — on le retrouve via le DOM.
  return document.querySelector('input[type="file"]')
}

describe('ImporterClients', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockImportClients.mockReset()
    mockUseAuth.mockReset()
    mockNotify.mockReset()
  })

  it('CAISSIER : redirige vers /accueil (réservé Responsable et MCD)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'CAISSIER' } })

    renderPage()

    await waitFor(() => expect(mockNavigate)
      .toHaveBeenCalledWith('/accueil', { replace: true }))
  })

  it('bouton « Importer » désactivé tant qu\'aucun fichier n\'est choisi', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })

    renderPage()

    expect(screen.getByRole('button', { name: 'Importer' })).toBeDisabled()
  })

  it('soumet un FormData et affiche le résumé', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockImportClients.mockResolvedValueOnce({
      imported: 12, skipped: 2, incomplete: 1, errors: [],
    })

    renderPage()

    const fichier = new File(['x'], 'clients.xlsx', { type: 'application/vnd.ms-excel' })
    await userEvent.upload(fileInput(), fichier)

    await userEvent.click(screen.getByRole('button', { name: 'Importer' }))

    await waitFor(() => expect(mockImportClients).toHaveBeenCalledWith(fichier))
    expect(await screen.findByText(/Résultat de l'import/)).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(mockNotify).toHaveBeenCalledWith(
      expect.stringContaining('12 client'),
      'success'
    )
  })

  it('résumé avec erreurs : notification warning et liste détaillée', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockImportClients.mockResolvedValueOnce({
      imported: 5, skipped: 0, incomplete: 0,
      errors: ['ligne 3 : date invalide', 'ligne 7 : nom vide'],
    })

    renderPage()
    await userEvent.upload(fileInput(), new File(['x'], 'c.xlsx'))
    await userEvent.click(screen.getByRole('button', { name: 'Importer' }))

    expect(await screen.findByText(/ligne 3 : date invalide/)).toBeInTheDocument()
    expect(screen.getByText(/ligne 7 : nom vide/)).toBeInTheDocument()
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'warning')
  })

  it('erreur réseau : affiche le message et n\'affiche pas de résumé', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockImportClients.mockRejectedValueOnce(new Error('Format de fichier invalide'))

    renderPage()
    await userEvent.upload(fileInput(), new File(['x'], 'c.xlsx'))
    await userEvent.click(screen.getByRole('button', { name: 'Importer' }))

    expect(await screen.findByText(/Format de fichier invalide/)).toBeInTheDocument()
    expect(screen.queryByText(/Résultat de l'import/)).not.toBeInTheDocument()
  })

  it('« Voir la liste des clients » après import OK → /clients', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })
    mockImportClients.mockResolvedValueOnce({
      imported: 1, skipped: 0, incomplete: 0, errors: [],
    })

    renderPage()
    await userEvent.upload(fileInput(), new File(['x'], 'c.xlsx'))
    await userEvent.click(screen.getByRole('button', { name: 'Importer' }))

    await screen.findByText(/Résultat de l'import/)
    await userEvent.click(screen.getByRole('button', { name: /Voir la liste des clients/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients')
  })

  it('« Retour » → /clients', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'MCD' } })

    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients')
  })
})
