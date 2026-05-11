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
 * Imprime une sous-fiche unique. On masque toutes les autres .fiche-papier
 * de la page via {@code style.display = 'none'} pendant le dialogue d'impression,
 * puis on restaure à la fermeture (afterprint). Cette approche par style inline
 * est plus robuste que de poser une classe sur body + filtrer en CSS, qui
 * dépendait du moment où le style est rafraîchi par le moteur d'impression.
 *
 * Si {@code typeFiltre} est null, c'est l'unique sous-fiche (fiche sans lignes
 * typées) qui est imprimée.
 */
export function imprimerSousFiche(fiche, typeFiltre) {
  const ficheId = String(fiche.id)
  const allPapiers = Array.from(document.querySelectorAll('.fiche-papier'))
  const target = allPapiers.find((el) => {
    if (el.dataset.ficheId !== ficheId) return false
    if (typeFiltre) return el.dataset.type === typeFiltre
    return !el.dataset.type
  })

  if (!target) {
    // Sécurité : on lance quand même l'impression globale plutôt que de ne
    // rien faire (mieux vaut imprimer trop que rien).
    window.print()
    return
  }

  const previous = document.title
  document.title = buildPrintTitle(fiche, typeFiltre)

  const hidden = []
  allPapiers.forEach((el) => {
    if (el !== target) {
      hidden.push({ el, prev: el.style.display })
      el.style.display = 'none'
    }
  })
  const prevBreakBefore = target.style.pageBreakBefore
  const prevBreakBefore2 = target.style.breakBefore
  target.style.pageBreakBefore = 'auto'
  target.style.breakBefore = 'auto'

  const restore = () => {
    document.title = previous
    hidden.forEach(({ el, prev }) => { el.style.display = prev })
    target.style.pageBreakBefore = prevBreakBefore
    target.style.breakBefore = prevBreakBefore2
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}
