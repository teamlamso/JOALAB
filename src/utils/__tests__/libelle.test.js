import { describe, it, expect } from 'vitest'
import { formatLibelle } from '../libelle.js'

describe('formatLibelle', () => {
  it('formate prénom + NOM en capitales', () => {
    expect(formatLibelle('Marie', 'Dupont')).toBe('Marie DUPONT')
  })

  it('trim les espaces parasites', () => {
    expect(formatLibelle('  Marie  ', '  Dupont  ')).toBe('Marie DUPONT')
  })

  it('renvoie chaîne vide si tout est vide', () => {
    expect(formatLibelle('', '')).toBe('')
    expect(formatLibelle(null, null)).toBe('')
    expect(formatLibelle(undefined, undefined)).toBe('')
  })

  it('omet le prénom si vide', () => {
    expect(formatLibelle('', 'Dupont')).toBe('DUPONT')
  })

  it('omet le nom si vide', () => {
    expect(formatLibelle('Marie', '')).toBe('Marie')
  })
})
