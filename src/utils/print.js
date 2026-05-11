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
 * Imprime une sous-fiche unique. Masque toutes les autres .fiche-papier
 * de la page via {@code style.display = 'none'} pendant l'impression, puis
 * restaure à la fermeture (événement afterprint).
 *
 * Toute la mécanique est encadrée d'un try/catch : si quoi que ce soit
 * échoue, on appelle quand même {@code window.print()} pour que l'utilisateur
 * obtienne au moins une impression (même non filtrée) plutôt que rien.
 */
export function imprimerSousFiche(fiche, typeFiltre) {
  let restoreFn = null

  try {
    const ficheId = String(fiche.id)
    const target = document.querySelector(
      typeFiltre
        ? `.fiche-papier[data-fiche-id="${ficheId}"][data-type="${typeFiltre}"]`
        : `.fiche-papier[data-fiche-id="${ficheId}"]:not([data-type])`
    )

    if (target) {
      const previous = document.title
      document.title = buildPrintTitle(fiche, typeFiltre)

      // Approche purement CSS : on marque la cible et on pose un drapeau
      // sur body. La règle CSS @media print { body.print-isolated
      // .fiche-papier:not(.print-target) { display: none } } fait le reste.
      // Pas de modification d'inline style, plus fiable sur les navigateurs
      // qui batchent agressivement les mutations (Zen).
      target.classList.add('print-target')
      document.body.classList.add('print-isolated')

      // Reflow synchrone : oblige le moteur à valider le nouvel état avant
      // window.print() — qu'on appelle dans le même tick pour préserver le
      // contexte d'action utilisateur (privacy mode strict).
      void target.offsetHeight

      restoreFn = () => {
        document.title = previous
        target.classList.remove('print-target')
        document.body.classList.remove('print-isolated')
      }
      const onAfter = () => {
        try { restoreFn() } catch { /* ignore */ }
        window.removeEventListener('afterprint', onAfter)
      }
      window.addEventListener('afterprint', onAfter)
    } else {
      console.warn('[print] cible introuvable pour fiche', fiche?.id, 'type', typeFiltre)
    }
  } catch (err) {
    console.error('[print] préparation échouée, impression non filtrée :', err)
    if (restoreFn) {
      try { restoreFn() } catch { /* ignore */ }
    }
  }

  window.print()
}
