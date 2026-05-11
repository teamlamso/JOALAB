const ORDRE_TYPES = ['MAS', 'JTE', 'JT']

/**
 * Construit le nom de fichier proposé à l'impression PDF d'une fiche unique :
 *   YYYY.MM.DD_NOM_Prenom[_<types>][_PPE]
 * où <types> est la liste des types de jeu présents séparés par "-" (MAS-JTE).
 * Pour un client non identifié, NOM_Prenom est remplacé par ANONYME.
 *
 * Si {@code typeOverride} est fourni (MAS/JTE/JT), seul ce type est utilisé
 * comme suffixe (impression d'une sous-fiche unique par type).
 */
export function buildPrintTitle(fiche, typeOverride = null) {
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
  const types = typeOverride
    ? [typeOverride]
    : ORDRE_TYPES.filter((t) => lignes.some((l) => l.typeJeu === t))
  const suffixes = []
  if (types.length > 0) suffixes.push(types.join('-'))
  if (fiche.clientPpe) suffixes.push('PPE')

  return [date, identite, ...suffixes].filter(Boolean).join('_')
}

export const ORDRE_TYPES_JEU = ORDRE_TYPES

/**
 * Imprime une sous-fiche unique en isolant temporairement son élément DOM
 * (classe {@code print-target}) pour que le filtre CSS @media print masque
 * toutes les autres .fiche-papier — utile aussi bien dans DetailFiche
 * (plusieurs sous-fiches d'une seule fiche) que dans ImprimerFiches (plusieurs
 * fiches consécutives, chacune avec ses sous-fiches).
 *
 * Si {@code typeFiltre} est null, c'est l'unique sous-fiche (fiche sans lignes
 * typées) qui est imprimée — la classe est posée sur l'élément ayant le bon
 * fiche-id et pas de data-type.
 */
export function imprimerSousFiche(fiche, typeFiltre) {
  const sel = typeFiltre
    ? `.fiche-papier[data-fiche-id="${fiche.id}"][data-type="${typeFiltre}"]`
    : `.fiche-papier[data-fiche-id="${fiche.id}"]:not([data-type])`
  const target = document.querySelector(sel)
  if (!target) {
    window.print()
    return
  }

  const previous = document.title
  document.title = buildPrintTitle(fiche, typeFiltre)
  target.classList.add('print-target')
  document.body.classList.add('print-only-target')

  const restore = () => {
    document.title = previous
    target.classList.remove('print-target')
    document.body.classList.remove('print-only-target')
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}
