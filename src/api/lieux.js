import { request } from './config.js'

/**
 * Recherche de lieux (villes) via le proxy backend.
 * Réponse : tableau d'objets {@code { label }} formatés « Ville (XX) ».
 *
 * @param {string} q     chaîne libre (au moins 3 caractères côté UI)
 * @param {number} limit nombre max de suggestions (défaut 6)
 * @returns {Promise<Array<{label: string}>>}
 */
export function searchLieux(q, limit = 6) {
  const params = new URLSearchParams({ q, limit: String(limit) })
  return request(`/lieux/search?${params}`)
}
