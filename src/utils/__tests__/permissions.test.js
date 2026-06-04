import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  jourTravailCourant,
  peutModifierFiche,
  peutSupprimerFiche,
  peutModifierClientComplet,
  peutSupprimerClient,
  peutListerUtilisateurs,
  peutModifierUtilisateur,
  peutArchiverUtilisateur,
  peutDesarchiverUtilisateur,
  peutLireJournal,
  peutLireHistoriqueFiche,
  peutImporterClients,
} from '../permissions.js'

beforeEach(() => {
  vi.useFakeTimers()
  // Fige l'horloge à un mercredi 14h heure locale.
  vi.setSystemTime(new Date(2026, 0, 14, 14, 0))
})

afterEach(() => vi.useRealTimers())

describe('jourTravailCourant', () => {
  it('renvoie la date du jour au format ISO si après 6h', () => {
    expect(jourTravailCourant()).toBe('2026-01-14')
  })

  it('renvoie la veille si avant 6h', () => {
    vi.setSystemTime(new Date(2026, 0, 14, 3, 0))
    expect(jourTravailCourant()).toBe('2026-01-13')
  })
})

describe('peutModifierFiche', () => {
  it('MCD peut modifier une fiche très ancienne', () => {
    expect(peutModifierFiche('MCD', '2020-01-01')).toBe(true)
  })

  it('CAISSIER peut modifier la fiche du jour et de la veille', () => {
    expect(peutModifierFiche('CAISSIER', '2026-01-14')).toBe(true)
    expect(peutModifierFiche('CAISSIER', '2026-01-13')).toBe(true)
  })

  it('CAISSIER ne peut pas modifier une fiche de 2 jours ou plus', () => {
    expect(peutModifierFiche('CAISSIER', '2026-01-12')).toBe(false)
  })

  it('RESPONSABLE_CAISSE peut modifier jusqu\'à 31 jours dans le passé', () => {
    expect(peutModifierFiche('RESPONSABLE_CAISSE', '2025-12-14')).toBe(true)
  })

  it('RESPONSABLE_CAISSE refuse au-delà de 31 jours', () => {
    expect(peutModifierFiche('RESPONSABLE_CAISSE', '2025-12-13')).toBe(false)
  })

  it('refuse les dates futures pour les rôles non-MCD', () => {
    expect(peutModifierFiche('CAISSIER', '2026-01-15')).toBe(false)
    expect(peutModifierFiche('RESPONSABLE_CAISSE', '2026-01-15')).toBe(false)
  })

  it('refuse si pas de rôle', () => {
    expect(peutModifierFiche(null, '2026-01-14')).toBe(false)
    expect(peutModifierFiche(undefined, '2026-01-14')).toBe(false)
  })
})

describe('peutSupprimerFiche', () => {
  it('seulement MCD', () => {
    expect(peutSupprimerFiche('MCD')).toBe(true)
    expect(peutSupprimerFiche('RESPONSABLE_CAISSE')).toBe(false)
    expect(peutSupprimerFiche('CAISSIER')).toBe(false)
  })
})

describe('peutModifierClientComplet', () => {
  it('MCD et RESPONSABLE_CAISSE', () => {
    expect(peutModifierClientComplet('MCD')).toBe(true)
    expect(peutModifierClientComplet('RESPONSABLE_CAISSE')).toBe(true)
    expect(peutModifierClientComplet('CAISSIER')).toBe(false)
  })
})

describe('peutSupprimerClient', () => {
  it('seulement MCD', () => {
    expect(peutSupprimerClient('MCD')).toBe(true)
    expect(peutSupprimerClient('RESPONSABLE_CAISSE')).toBe(false)
    expect(peutSupprimerClient('CAISSIER')).toBe(false)
  })
})

describe('peutListerUtilisateurs', () => {
  it('MCD et RESPONSABLE_CAISSE', () => {
    expect(peutListerUtilisateurs('MCD')).toBe(true)
    expect(peutListerUtilisateurs('RESPONSABLE_CAISSE')).toBe(true)
    expect(peutListerUtilisateurs('CAISSIER')).toBe(false)
  })
})

describe('peutModifierUtilisateur / peutArchiverUtilisateur / peutDesarchiverUtilisateur', () => {
  it('seulement MCD', () => {
    expect(peutModifierUtilisateur('MCD')).toBe(true)
    expect(peutModifierUtilisateur('RESPONSABLE_CAISSE')).toBe(false)
    expect(peutArchiverUtilisateur('MCD')).toBe(true)
    expect(peutArchiverUtilisateur('CAISSIER')).toBe(false)
    expect(peutDesarchiverUtilisateur('MCD')).toBe(true)
    expect(peutDesarchiverUtilisateur('CAISSIER')).toBe(false)
  })
})

describe('peutLireJournal', () => {
  it('seulement MCD', () => {
    expect(peutLireJournal('MCD')).toBe(true)
    expect(peutLireJournal('RESPONSABLE_CAISSE')).toBe(false)
    expect(peutLireJournal('CAISSIER')).toBe(false)
  })
})

describe('peutLireHistoriqueFiche', () => {
  it('MCD et RESPONSABLE_CAISSE', () => {
    expect(peutLireHistoriqueFiche('MCD')).toBe(true)
    expect(peutLireHistoriqueFiche('RESPONSABLE_CAISSE')).toBe(true)
    expect(peutLireHistoriqueFiche('CAISSIER')).toBe(false)
  })
})

describe('peutImporterClients', () => {
  it('MCD et RESPONSABLE_CAISSE', () => {
    expect(peutImporterClients('MCD')).toBe(true)
    expect(peutImporterClients('RESPONSABLE_CAISSE')).toBe(true)
    expect(peutImporterClients('CAISSIER')).toBe(false)
  })
})
