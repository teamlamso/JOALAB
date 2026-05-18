/**
 * Helpers de formatage partagés (date, monnaie, journée de travail).
 *
 * La journée de travail court de 06h00 à 05h59 le lendemain : avant 06h00,
 * on est encore considéré « la veille » pour l'application.
 */

export const WORK_DAY_START_HOUR = 6

const EUR_FMT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export function workDay() {
  const now = new Date()
  if (now.getHours() < WORK_DAY_START_HOUR) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

export function workDayYesterday() {
  const d = new Date(workDay())
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Convertit une date ISO `yyyy-MM-dd` (ou `yyyy-MM-ddTHH:mm:ss`) en `DD/MM/YYYY`. */
export function formatDateFr(iso) {
  if (!iso) return ''
  try {
    const [y, m, d] = iso.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  } catch {
    return iso
  }
}

/** Formate un montant en euros. Retourne `placeholder` (`-` par défaut) si nul. */
export function formatEur(value, placeholder = '-') {
  if (value == null || Number(value) === 0) return placeholder
  return EUR_FMT.format(value)
}
