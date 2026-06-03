import { request } from './config.js'

/**
 * Recherche d'adresses via le proxy backend (BAN + fallback Nominatim).
 *
 * @param {string} q     chaîne libre (au moins 3 caractères côté UI)
 * @param {number} limit nombre max de suggestions (défaut 6)
 * @returns {Promise<Array<{label, rue, codePostal, ville, pays}>>}
 */
export function searchAdresses(q, limit = 6) {
  const params = new URLSearchParams({ q, limit: String(limit) })
  return request(`/adresses/search?${params}`)
}
