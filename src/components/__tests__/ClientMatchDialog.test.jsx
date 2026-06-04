import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ClientMatchDialog from '../ClientMatchDialog.jsx'

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ClientMatchDialog', () => {
  const candidate = {
    id: 7,
    libelle: 'Marie DUPONT',
    ppe: false,
    nom: 'Dupont',
    prenom: 'Marie',
    dateNaissance: '1985-03-15',
    lieuNaissance: 'Lyon',
  }

  it('ne rend rien sans candidats', () => {
    const { container } = renderWithRouter(
      <ClientMatchDialog candidates={[]} newData={{}} onMerge={() => {}} onContinue={() => {}} onCancel={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le libellé du candidat unique', () => {
    renderWithRouter(
      <ClientMatchDialog
        candidates={[candidate]}
        newData={{ nom: 'Dupont', prenom: 'Marie', dateNaissance: '1985-03-15', lieuNaissance: 'Lyon' }}
        onMerge={() => {}}
        onContinue={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(/Marie DUPONT/)).toBeInTheDocument()
    expect(screen.getByText(/Aucune différence/)).toBeInTheDocument()
  })

  it('badge PPE affiché si candidat PPE', () => {
    renderWithRouter(
      <ClientMatchDialog
        candidates={[{ ...candidate, ppe: true }]}
        newData={{}}
        onMerge={() => {}}
        onContinue={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText('PPE')).toBeInTheDocument()
  })

  it('détecte les différences sur les champs', () => {
    renderWithRouter(
      <ClientMatchDialog
        candidates={[candidate]}
        newData={{ nom: 'Dupond', prenom: 'Marie', dateNaissance: '1985-03-15', lieuNaissance: 'Lyon' }}
        onMerge={() => {}}
        onContinue={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(/Différences détectées/)).toBeInTheDocument()
  })

  it('bouton Fusionner désactivé si pas de différence', () => {
    renderWithRouter(
      <ClientMatchDialog
        candidates={[candidate]}
        newData={{ nom: 'Dupont', prenom: 'Marie', dateNaissance: '1985-03-15', lieuNaissance: 'Lyon' }}
        onMerge={() => {}}
        onContinue={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'Fusionner' })).toBeDisabled()
  })

  it('bouton Fusionner actif si différence et appelle onMerge', async () => {
    const onMerge = vi.fn()
    renderWithRouter(
      <ClientMatchDialog
        candidates={[candidate]}
        newData={{ nom: 'Dupond', prenom: 'Marie' }}
        onMerge={onMerge}
        onContinue={() => {}}
        onCancel={() => {}}
      />
    )
    const btn = screen.getByRole('button', { name: 'Fusionner' })
    expect(btn).toBeEnabled()
    await userEvent.click(btn)
    expect(onMerge).toHaveBeenCalledWith(candidate)
  })

  it('bouton Continuer sans fusionner appelle onContinue', async () => {
    const onContinue = vi.fn()
    renderWithRouter(
      <ClientMatchDialog
        candidates={[candidate]}
        newData={{ nom: 'Dupond' }}
        onMerge={() => {}}
        onContinue={onContinue}
        onCancel={() => {}}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Continuer sans fusionner' }))
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('bouton Annuler appelle onCancel', async () => {
    const onCancel = vi.fn()
    renderWithRouter(
      <ClientMatchDialog
        candidates={[candidate]}
        newData={{}}
        onMerge={() => {}}
        onContinue={() => {}}
        onCancel={onCancel}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('résumé pluriel pour plusieurs candidats', () => {
    renderWithRouter(
      <ClientMatchDialog
        candidates={[candidate, { ...candidate, id: 8 }]}
        newData={{}}
        onMerge={() => {}}
        onContinue={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(/2 clients similaires/)).toBeInTheDocument()
  })
})
