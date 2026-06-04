import { describe, it, expect } from 'vitest'
import { buildPrintTitle, ORDRE_TYPES_JEU } from '../print.js'

describe('buildPrintTitle', () => {
  it('client identifié avec un type de jeu', () => {
    const fiche = {
      date: '2026-01-15',
      clientIdentifie: true,
      clientNom: 'Dupont',
      clientPrenom: 'Marie',
      clientPpe: false,
      lignes: [{ typeJeu: 'MAS' }],
    }
    expect(buildPrintTitle(fiche)).toBe('2026.01.15_DUPONT_Marie_MAS')
  })

  it('client identifié, plusieurs types de jeu', () => {
    const fiche = {
      date: '2026-01-15',
      clientIdentifie: true,
      clientNom: 'Dupont',
      clientPrenom: 'Marie',
      lignes: [{ typeJeu: 'MAS' }, { typeJeu: 'JTE' }],
    }
    expect(buildPrintTitle(fiche)).toBe('2026.01.15_DUPONT_Marie_MAS-JTE')
  })

  it('ajoute le suffixe PPE quand activé', () => {
    const fiche = {
      date: '2026-01-15',
      clientIdentifie: true,
      clientNom: 'Dupont',
      clientPrenom: 'Marie',
      clientPpe: true,
      lignes: [{ typeJeu: 'MAS' }],
    }
    expect(buildPrintTitle(fiche)).toBe('2026.01.15_DUPONT_Marie_MAS_PPE')
  })

  it('client non identifié → ANONYME', () => {
    const fiche = {
      date: '2026-01-15',
      clientIdentifie: false,
      lignes: [{ typeJeu: 'MAS' }],
    }
    expect(buildPrintTitle(fiche)).toBe('2026.01.15_ANONYME_MAS')
  })

  it('aucune ligne → pas de suffixe types', () => {
    const fiche = {
      date: '2026-01-15',
      clientIdentifie: true,
      clientNom: 'Dupont',
      clientPrenom: 'Marie',
      lignes: [],
    }
    expect(buildPrintTitle(fiche)).toBe('2026.01.15_DUPONT_Marie')
  })

  it('typeOverride force un seul type', () => {
    const fiche = {
      date: '2026-01-15',
      clientIdentifie: true,
      clientNom: 'Dupont',
      clientPrenom: 'Marie',
      lignes: [{ typeJeu: 'MAS' }, { typeJeu: 'JTE' }],
    }
    expect(buildPrintTitle(fiche, 'JTE')).toBe('2026.01.15_DUPONT_Marie_JTE')
  })

  it('remplace espaces dans prénom/nom par des tirets', () => {
    const fiche = {
      date: '2026-01-15',
      clientIdentifie: true,
      clientNom: 'De La Fontaine',
      clientPrenom: 'Jean Pierre',
      lignes: [{ typeJeu: 'MAS' }],
    }
    expect(buildPrintTitle(fiche)).toBe('2026.01.15_DE-LA-FONTAINE_Jean-Pierre_MAS')
  })
})

describe('ORDRE_TYPES_JEU', () => {
  it('contient MAS, JTE, JT dans cet ordre', () => {
    expect(ORDRE_TYPES_JEU).toEqual(['MAS', 'JTE', 'JT'])
  })
})
