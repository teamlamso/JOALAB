/**
 * Format d'affichage canonique d'une personne : « Prénom NOM » (nom de
 * famille en capitales). Utilisé partout côté front quand on doit afficher
 * un nom à partir de ses composants — pour les libellés calculés côté
 * backend (Client.getLibelle), le format est déjà appliqué.
 */
export function formatLibelle(prenom, nom) {
  const p = (prenom || '').trim()
  const n = (nom || '').trim().toUpperCase()
  return [p, n].filter(Boolean).join(' ')
}
