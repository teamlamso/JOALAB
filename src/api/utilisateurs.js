import { request } from './config.js'

/** Liste les utilisateurs applicatifs. Accessible RESPONSABLE_CAISSE et MCD. */
export function listUtilisateurs() {
  return request('/utilisateurs')
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
