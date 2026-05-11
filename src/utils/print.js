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
    const allPapiers = Array.from(document.querySelectorAll('.fiche-papier'))
    const target = allPapiers.find((el) => {
      if (el.dataset.ficheId !== ficheId) return false
      if (typeFiltre) return el.dataset.type === typeFiltre
      return !el.dataset.type
    })

    if (target) {
      const previous = document.title
      document.title = buildPrintTitle(fiche, typeFiltre)

      const hidden = []
      allPapiers.forEach((el) => {
        if (el !== target) {
          hidden.push({ el, prev: el.style.display })
          el.style.display = 'none'
        }
      })
      const hadPageBreak = target.classList.contains('fiche-papier-page-break')
      if (hadPageBreak) target.classList.remove('fiche-papier-page-break')

      // Force le navigateur à appliquer immédiatement les changements de
      // style/classe avant window.print(). Lire offsetHeight oblige un
      // reflow synchrone : le moteur d'impression voit alors la version
      // finale du layout sans qu'on ait à différer print() (ce qui
      // romprait le contexte d'action utilisateur sur les navigateurs au
      // mode privacy strict, comme Zen).
      void target.offsetHeight

      restoreFn = () => {
        document.title = previous
        hidden.forEach(({ el, prev }) => { el.style.display = prev })
        if (hadPageBreak) target.classList.add('fiche-papier-page-break')
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

  // Appel synchrone depuis le handler de clic pour préserver le contexte
  // d'action utilisateur — requis par certains navigateurs (Zen, Firefox
  // en mode privacy strict) qui bloquent silencieusement window.print()
  // s'il est appelé depuis un setTimeout/rAF.
  window.print()
}
