export const TYPES_PIECE = [
  'CNIe',
  'CNI',
  'Permis de Conduire (Carte)',
  'Permis de Conduire (Papier)',
  'Passeport Français',
  'Passeport Etranger',
  'Carte Identité Etrangère',
  'Titre de Séjour',
]

export const PIECES_AVEC_PREFECTURE = [
  'CNI',
  'Permis de Conduire (Carte)',
  'Permis de Conduire (Papier)',
  'Passeport Français',
  'Titre de Séjour',
]

export const PIECES_AVEC_PAYS = [
  'Passeport Etranger',
  'Carte Identité Etrangère',
]

/**
 * Libellés affichés pour les champs manquants d'un client. Les clés sont
 * celles retournées par {@code Client#getChampsManquants} côté backend.
 */
export const LIBELLES_CHAMPS = {
  nom: 'Nom',
  prenom: 'Prénom',
  dateNaissance: 'Date de naissance',
  lieuNaissance: 'Lieu de naissance',
  rue: 'Rue',
  codePostal: 'Code postal',
  ville: 'Ville',
  pays: 'Pays',
  typePiece: 'Type de pièce',
  numeroPiece: 'Numéro de pièce',
  dateDelivrance: 'Date de délivrance',
  origineDelivrance: 'Préfecture ou pays de délivrance',
  descriptionPhysique: 'Description physique',
}

/** Convertit la liste des champs manquants en libellés lisibles. */
export function libellesChampsManquants(champs) {
  if (!champs || champs.length === 0) return []
  return champs.map((c) => LIBELLES_CHAMPS[c] || c)
}

/** Liste lisible en français pour un tooltip ou un message. */
export function texteChampsManquants(champs) {
  return libellesChampsManquants(champs).join(', ')
}
