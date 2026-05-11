const ORDRE_TYPES = ['MAS', 'JTE', 'JT']

/**
 * Construit le nom de fichier proposé à l'impression PDF d'une fiche unique :
 *   YYYY.MM.DD_NOM_Prenom[_<types>][_PPE]
 * où <types> est la liste des types de jeu présents séparés par "-" (MAS-JTE).
 * Pour un client non identifié, NOM_Prenom est remplacé par ANONYME.
 */
export function buildPrintTitle(fiche) {
  const date = fiche.date ? fiche.date.replace(/-/g, '.') : ''
  let identite
  if (fiche.clientIdentifie) {
    const nom = (fiche.clientNom || '').toUpperCase().replace(/\s+/g, '-')
    const prenom = (fiche.clientPrenom || '').replace(/\s+/g, '-')
    identite = `${nom}_${prenom}`
  } else {
    identite = 'ANONYME'
  }

  const lignes = fiche.lignes ?? []
  const types = ORDRE_TYPES.filter((t) => lignes.some((l) => l.typeJeu === t))
  const suffixes = []
  if (types.length > 0) suffixes.push(types.join('-'))
  if (fiche.clientPpe) suffixes.push('PPE')

  return [date, identite, ...suffixes].filter(Boolean).join('_')
}
