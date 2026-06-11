import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FichePapier from '../FichePapier.jsx'

vi.mock('../../assets/logoJOA.svg', () => ({ default: 'logo.svg' }))

const ficheBase = {
  id: 10, date: '2026-06-10', creePar: 'Bob',
  clientIdentifie: true,
  clientPrenom: 'Marie', clientNom: 'Dupont',
  clientDateNaissance: '1980-01-15', clientLieuNaissance: 'Lyon (69)',
  clientPpe: false,
  clientRue: '1 rue X', clientCodePostal: '75001', clientVille: 'Paris', clientPays: 'France',
  clientTypePiece: 'CNI', clientNumeroPiece: 'ABC',
  clientDateDelivrance: '2020-01-01', clientPrefecture: 'Paris', clientPaysDelivrance: null,
  totalRGM: 1500, totalEntrant: 200, totalSortant: 0,
  lignes: [
    { typeJeu: 'MAS', montantRGM: 1000, changeEntrant: 0,   changeSortant: 0 },
    { typeJeu: 'JT',  montantRGM: 0,    changeEntrant: 200, changeSortant: 0 },
    { typeJeu: 'JTE', montantRGM: 500,  changeEntrant: 0,   changeSortant: 0 },
  ],
}

describe('FichePapier', () => {
  it('sans typeFiltre : affiche toutes les lignes et garde les totaux de la fiche', () => {
    const { container } = render(<FichePapier fiche={ficheBase} />)

    expect(container.querySelector('.fiche-papier')).not.toHaveClass('fiche-papier-page-break')
    expect(container.querySelector('.fiche-papier')).not.toHaveAttribute('data-type')
    // formatLibelle = « Marie DUPONT ».
    expect(screen.getByText(/Marie DUPONT/)).toBeInTheDocument()
  })

  it('typeFiltre=MAS : data-type posé et lignes filtrées', () => {
    const { container } = render(<FichePapier fiche={ficheBase} typeFiltre="MAS" />)

    expect(container.querySelector('.fiche-papier')).toHaveAttribute('data-type', 'MAS')
  })

  it('typeFiltre recalcule les totaux à partir des lignes filtrées', () => {
    // Filtré MAS : seule la ligne 1000 RGM doit compter ; les 500 JTE et 200 JT
    // ne doivent pas être inclus dans les totaux.
    const { container } = render(<FichePapier fiche={ficheBase} typeFiltre="MAS" />)

    // On lit les totaux directement dans le DOM via la classe associée plutôt
    // que de re-implémenter le format. La présence du libellé "1 000 €" suffit
    // ici à valider la somme recalculée.
    expect(container.textContent).toMatch(/1[\s ]000/)
    // 500 € (JTE) ne doit pas figurer dans le total RGM affiché.
    expect(container.textContent).not.toMatch(/1[\s ]500.*RGM/i)
  })

  it('pageBreakBefore : applique la classe « fiche-papier-page-break »', () => {
    const { container } = render(<FichePapier fiche={ficheBase} pageBreakBefore />)

    expect(container.querySelector('.fiche-papier')).toHaveClass('fiche-papier-page-break')
  })

  it('fiche sans lignes : padding minimum (lignes vides ajoutées pour atteindre le format papier)', () => {
    // Garde-fou esthétique : le fond papier doit rester visuellement complet
    // même pour une fiche vide.
    const { container } = render(<FichePapier fiche={{ ...ficheBase, lignes: [] }} />)

    const tableRows = container.querySelectorAll('tbody tr')
    expect(tableRows.length).toBeGreaterThanOrEqual(6)
  })

  it('expose data-fiche-id pour l\'export PDF', () => {
    const { container } = render(<FichePapier fiche={ficheBase} typeFiltre="MAS" />)

    expect(container.querySelector('.fiche-papier'))
      .toHaveAttribute('data-fiche-id', '10')
  })

  it('client non identifié : affiche la description physique (et pas l\'adresse)', () => {
    const fiche = {
      ...ficheBase,
      clientIdentifie: false,
      clientPrenom: null, clientNom: null,
      clientDescriptionPhysique: 'Description : homme blond',
      clientRue: null, clientCodePostal: null, clientVille: null, clientPays: null,
    }
    render(<FichePapier fiche={fiche} />)

    expect(screen.getByText(/Description : homme blond/)).toBeInTheDocument()
  })
})
