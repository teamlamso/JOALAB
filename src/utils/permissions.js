/**
 * Matrice de droits côté UI. Réplique des règles côté backend
 * (PermissionService) pour décider quels boutons afficher. La sécurité reste
 * portée par le backend : le front masque mais ne protège pas.
 *
 * Règles :
 *   - CAISSIER : modifier fiches du jour de travail courant et de la veille,
 *     modifier l'adresse et la pièce d'identité d'un client.
 *   - RESPONSABLE_CAISSE : modifier fiches jusqu'à 31 jours dans le passé,
 *     modifier l'identité complète d'un client, créer des CAISSIER.
 *   - MCD : modifier toutes les fiches, supprimer fiches et clients, créer
 *     n'importe quel rôle, consulter le journal global.
 */

const FENETRE_CAISSIER_JOURS    = 1
const FENETRE_RESPONSABLE_JOURS = 31

/** Jour de travail courant (06h00 → 05h59 le lendemain), au format yyyy-MM-dd. */
export function jourTravailCourant() {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

/** Nombre de jours entre {@code ficheDate} (yyyy-MM-dd) et le jour de travail courant. */
function ecartJours(ficheDate) {
  if (!ficheDate) return Infinity
  const a = new Date(ficheDate)
  const b = new Date(jourTravailCourant())
  return Math.round((b - a) / (24 * 3600 * 1000))
}

export function peutModifierFiche(role, ficheDate) {
  if (!role) return false
  if (role === 'MCD') return true
  const ecart = ecartJours(ficheDate)
  if (ecart < 0) return false
  if (role === 'CAISSIER')           return ecart <= FENETRE_CAISSIER_JOURS
  if (role === 'RESPONSABLE_CAISSE') return ecart <= FENETRE_RESPONSABLE_JOURS
  return false
}

export function peutSupprimerFiche(role) {
  return role === 'MCD'
}

export function peutModifierClientComplet(role) {
  return role === 'RESPONSABLE_CAISSE' || role === 'MCD'
}

export function peutSupprimerClient(role) {
  return role === 'MCD'
}

export function peutListerUtilisateurs(role) {
  return role === 'RESPONSABLE_CAISSE' || role === 'MCD'
}

export function peutLireJournal(role) {
  return role === 'MCD'
}

/**
 * Historique d'une fiche : RESPONSABLE_CAISSE et MCD. Les CAISSIER n'ont pas
 * accès à l'historique des actions effectuées sur une fiche.
 */
export function peutLireHistoriqueFiche(role) {
  return role === 'RESPONSABLE_CAISSE' || role === 'MCD'
}

/** Import Excel de clients : RESPONSABLE_CAISSE et MCD. */
export function peutImporterClients(role) {
  return role === 'RESPONSABLE_CAISSE' || role === 'MCD'
}
