import { describe, it, expect } from 'vitest'
import {
  TYPES_PIECE,
  PIECES_AVEC_PREFECTURE,
  PIECES_AVEC_PAYS,
  LIBELLES_CHAMPS,
  libellesChampsManquants,
  texteChampsManquants,
} from '../champsClient.js'

describe('constantes', () => {
  it('TYPES_PIECE non vide', () => {
    expect(TYPES_PIECE.length).toBeGreaterThan(0)
    expect(TYPES_PIECE).toContain('CNI')
  })

  it('PIECES_AVEC_PREFECTURE est un sous-ensemble de TYPES_PIECE', () => {
    PIECES_AVEC_PREFECTURE.forEach((p) => expect(TYPES_PIECE).toContain(p))
  })

  it('PIECES_AVEC_PAYS est un sous-ensemble de TYPES_PIECE', () => {
    PIECES_AVEC_PAYS.forEach((p) => expect(TYPES_PIECE).toContain(p))
  })
})

describe('libellesChampsManquants', () => {
  it('mappe les clés vers les libellés', () => {
    expect(libellesChampsManquants(['nom', 'prenom'])).toEqual(['Nom', 'Prénom'])
  })

  it('renvoie tableau vide pour null / undefined / vide', () => {
    expect(libellesChampsManquants(null)).toEqual([])
    expect(libellesChampsManquants(undefined)).toEqual([])
    expect(libellesChampsManquants([])).toEqual([])
  })

  it('conserve la clé brute pour un champ inconnu', () => {
    expect(libellesChampsManquants(['inconnu'])).toEqual(['inconnu'])
  })

  it('mappe origineDelivrance vers son libellé compact', () => {
    expect(libellesChampsManquants(['origineDelivrance'])).toEqual([LIBELLES_CHAMPS.origineDelivrance])
  })
})

describe('texteChampsManquants', () => {
  it('joint avec virgule', () => {
    expect(texteChampsManquants(['nom', 'prenom'])).toBe('Nom, Prénom')
  })

  it('chaîne vide pour vide', () => {
    expect(texteChampsManquants([])).toBe('')
  })
})
