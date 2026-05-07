import FichePapier from './FichePapier.jsx'

const ORDRE_TYPES = ['MAS', 'JTE', 'JT']

/**
 * Rendu d'une fiche LAB-FT pouvant contenir plusieurs types de jeu.
 *
 * <p>Si la fiche comporte plusieurs types de jeu, on rend une sous-fiche papier
 * par type (dans l'ordre MAS → JTE → JT). Si la fiche n'a aucune ligne avec
 * type de jeu (cas d'une fiche vide pour client PPE), on rend une seule fiche.
 *
 * <p>Chaque sous-fiche démarre sur une nouvelle page à l'impression pour ne pas
 * être coupée. {@code pageBreakBefore} contrôle uniquement le saut avant la
 * toute première sous-fiche (utile entre fiches en BDD distinctes — déjà géré).
 */
export default function FichePapierMulti({ fiche, pageBreakBefore = false }) {
  const lignes = fiche.lignes ?? []
  const typesPresents = ORDRE_TYPES.filter((t) => lignes.some((l) => l.typeJeu === t))

  if (typesPresents.length === 0) {
    return <FichePapier fiche={fiche} pageBreakBefore={pageBreakBefore} />
  }

  return (
    <>
      {typesPresents.map((t, i) => (
        <FichePapier
          key={t}
          fiche={fiche}
          typeFiltre={t}
          pageBreakBefore={i === 0 ? pageBreakBefore : true}
        />
      ))}
    </>
  )
}
