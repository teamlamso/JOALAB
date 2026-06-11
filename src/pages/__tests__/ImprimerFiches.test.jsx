import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockGetFiche = vi.fn()
vi.mock('../../api/fiches.js', () => ({
  getFiche: (...a) => mockGetFiche(...a),
}))

const mockImprimerSousFiche = vi.fn()
vi.mock('../../utils/print.js', async () => {
  const actual = await vi.importActual('../../utils/print.js')
  return { ...actual, imprimerSousFiche: (...a) => mockImprimerSousFiche(...a) }
})

vi.mock('../../components/FichePapier.jsx', () => ({
  default: ({ fiche, typeFiltre }) =>
    <div data-testid={`papier-${fiche.id}-${typeFiltre ?? 'all'}`} />,
}))

import ImprimerFiches from '../ImprimerFiches.jsx'

function renderPageWithIds(ids) {
  return render(
    <MemoryRouter initialEntries={[`/fiches/imprimer?ids=${ids}`]}>
      <ImprimerFiches />
    </MemoryRouter>
  )
}

describe('ImprimerFiches', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGetFiche.mockReset()
    mockImprimerSousFiche.mockReset()
  })

  it('sans ids dans l\'URL : affiche le placeholder « Aucune fiche à imprimer »', async () => {
    renderPageWithIds('')

    expect(await screen.findByText(/Aucune fiche à imprimer/)).toBeInTheDocument()
    expect(mockGetFiche).not.toHaveBeenCalled()
  })

  it('lance getFiche pour chaque id et affiche un papier par fiche', async () => {
    mockGetFiche.mockImplementation((id) =>
      Promise.resolve({ id: Number(id), date: '2026-06-10', lignes: [] })
    )

    renderPageWithIds('1,2,3')

    expect(await screen.findByTestId('papier-1-all')).toBeInTheDocument()
    expect(screen.getByTestId('papier-2-all')).toBeInTheDocument()
    expect(screen.getByTestId('papier-3-all')).toBeInTheDocument()
    expect(mockGetFiche).toHaveBeenCalledTimes(3)
  })

  it('éclate une fiche multi-types en sous-fiches dans l\'ordre MAS → JTE → JT', async () => {
    mockGetFiche.mockResolvedValueOnce({
      id: 1, date: '2026-06-10',
      lignes: [
        { typeJeu: 'JT' }, { typeJeu: 'MAS' }, { typeJeu: 'JTE' },
      ],
    })

    renderPageWithIds('1')

    await screen.findByTestId('papier-1-MAS')
    const order = ['papier-1-MAS', 'papier-1-JTE', 'papier-1-JT']
    const sousFiches = order.map((tid) => screen.getByTestId(tid))
    // L'ordre DOM doit être MAS, JTE, JT.
    expect(sousFiches[0].compareDocumentPosition(sousFiches[1])
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(sousFiches[1].compareDocumentPosition(sousFiches[2])
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('erreur réseau : affiche le message', async () => {
    mockGetFiche.mockRejectedValueOnce(new Error('Fiche 999 introuvable'))

    renderPageWithIds('999')

    expect(await screen.findByText(/Fiche 999 introuvable/)).toBeInTheDocument()
  })

  it('affiche le pluriel correct dans le titre', async () => {
    mockGetFiche.mockImplementation((id) =>
      Promise.resolve({ id: Number(id), date: '2026-06-10', lignes: [] })
    )

    renderPageWithIds('1,2')

    expect(await screen.findByText(/2 fiches/)).toBeInTheDocument()
  })

  it('bouton « Imprimer cette fiche » appelle imprimerSousFiche avec le bon type', async () => {
    mockGetFiche.mockResolvedValueOnce({
      id: 5, date: '2026-06-10',
      lignes: [{ typeJeu: 'MAS' }],
    })

    renderPageWithIds('5')

    await screen.findByTestId('papier-5-MAS')
    await userEvent.click(screen.getByRole('button', { name: /Imprimer cette fiche/ }))

    expect(mockImprimerSousFiche).toHaveBeenCalledOnce()
    expect(mockImprimerSousFiche.mock.calls[0][1]).toBe('MAS')
  })

  it('« Retour » → /accueil', async () => {
    mockGetFiche.mockResolvedValueOnce({ id: 1, date: '2026-06-10', lignes: [] })

    renderPageWithIds('1')

    await userEvent.click(await screen.findByRole('button', { name: /Retour/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/accueil')
  })
})
