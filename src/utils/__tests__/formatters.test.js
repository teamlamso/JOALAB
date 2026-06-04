import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  formatDateFr,
  formatEur,
  workDay,
  workDayYesterday,
  WORK_DAY_START_HOUR,
} from '../formatters.js'

describe('formatDateFr', () => {
  it('convertit yyyy-MM-dd en DD/MM/YYYY', () => {
    expect(formatDateFr('2026-01-15')).toBe('15/01/2026')
  })

  it('accepte un datetime ISO en ne gardant que la date', () => {
    expect(formatDateFr('2026-01-15T14:30:00')).toBe('15/01/2026')
  })

  it('renvoie chaîne vide pour null/undefined/vide', () => {
    expect(formatDateFr(null)).toBe('')
    expect(formatDateFr(undefined)).toBe('')
    expect(formatDateFr('')).toBe('')
  })
})

describe('formatEur', () => {
  it('formate un nombre positif en euros', () => {
    expect(formatEur(500)).toContain('500')
    expect(formatEur(500)).toContain('€')
  })

  it('renvoie le placeholder pour null/0', () => {
    expect(formatEur(null)).toBe('-')
    expect(formatEur(0)).toBe('-')
    expect(formatEur(undefined)).toBe('-')
  })

  it('accepte un placeholder personnalisé', () => {
    expect(formatEur(null, '')).toBe('')
    expect(formatEur(0, 'n/a')).toBe('n/a')
  })

  it('formate avec séparateurs français', () => {
    const result = formatEur(1500.5)
    expect(result).toMatch(/1.500,50/)
  })
})

describe('workDay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renvoie la date du jour si l\'heure est ≥ 6h', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 10, 0))
    expect(workDay()).toBe('2026-01-15')
  })

  it('renvoie la veille si l\'heure est < 6h', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 3, 0))
    expect(workDay()).toBe('2026-01-14')
  })

  it('renvoie la date du jour à 6h pile', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 6, 0))
    expect(workDay()).toBe('2026-01-15')
  })

  it('workDayYesterday est la veille du workDay', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 10, 0))
    expect(workDayYesterday()).toBe('2026-01-14')
  })
})

describe('WORK_DAY_START_HOUR', () => {
  it('est à 6h pour aligner avec le backend', () => {
    expect(WORK_DAY_START_HOUR).toBe(6)
  })
})
