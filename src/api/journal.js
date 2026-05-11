import { request } from './config.js'

/** Récupère le journal global (MCD uniquement). */
export function listJournal() {
  return request('/journal')
}

/** Récupère l'historique d'audit d'une fiche (tous rôles authentifiés). */
export function getHistoriqueFiche(ficheId) {
  return request(`/fiches/${ficheId}/historique`)
}
