import { request } from './config.js'

/** Liste les utilisateurs applicatifs. Accessible RESPONSABLE_CAISSE et MCD. */
export function listUtilisateurs({ includeArchives = false } = {}) {
  const qs = includeArchives ? '?includeArchives=true' : ''
  return request(`/utilisateurs${qs}`)
}

/**
 * Crée un nouvel utilisateur. Le rôle de l'appelant doit autoriser le rôle
 * cible (MCD → tous rôles ; RESPONSABLE_CAISSE → CAISSIER uniquement).
 *
 * @param {{identifiant: string, motDePasse: string, nom: string, prenom: string, role: string}} data
 */
export function createUtilisateur(data) {
  return request('/utilisateurs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Modifie un utilisateur existant. Sémantique PATCH : seuls les champs définis
 * sont mis à jour. Réservé aux MCD côté backend.
 *
 * @param {number} id
 * @param {{identifiant?: string, nom?: string, prenom?: string, role?: string}} data
 */
export function updateUtilisateur(id, data) {
  return request(`/utilisateurs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Archive un utilisateur (soft-delete). Le compte disparaît de la liste, ne peut
 * plus se connecter et ses sessions actives sont invalidées, mais ses références
 * historiques (fiches, lignes, journal) sont préservées. Réservé aux MCD.
 *
 * @param {number} id
 */
export function archiverUtilisateur(id) {
  return request(`/utilisateurs/${id}/archiver`, {
    method: 'POST',
  })
}

/**
 * Réactive un compte précédemment archivé : le compte peut à nouveau se
 * connecter avec son mot de passe existant. Réservé aux MCD.
 *
 * @param {number} id
 */
export function desarchiverUtilisateur(id) {
  return request(`/utilisateurs/${id}/desarchiver`, {
    method: 'POST',
  })
}
