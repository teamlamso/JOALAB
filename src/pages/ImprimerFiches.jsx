import { Fragment, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getFiche } from '../api/fiches.js'
import FichePapier from '../components/FichePapier.jsx'
import { buildPrintTitle, imprimerSousFiche, ORDRE_TYPES_JEU } from '../utils/print.js'

/** Page de prévisualisation puis impression groupée. Reçoit `?ids=1,2,3`,
 *  charge toutes les fiches et les affiche à la suite — chacune éclatée par
 *  type de jeu présent. L'utilisateur peut imprimer le tout via le bouton
 *  principal, ou n'imprimer qu'une sous-fiche via le bouton placé sous elle. */
export default function ImprimerFiches() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const idsParam = params.get('ids') || ''
  const ids = idsParam.split(',').filter(Boolean)

  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false)
      return
    }
    Promise.all(ids.map((id) => getFiche(id)))
      .then(setFiches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [idsParam])

  const lancerImpression = () => {
    const previous = document.title
    document.title = fiches.length === 1
      ? buildPrintTitle(fiches[0])
      : `Fiches_${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}`
    const restore = () => {
      document.title = previous
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
  }

  if (loading) return <div className="loading">Chargement…</div>
  if (error) return <div className="page"><div className="alert-error">{error}</div></div>
  if (fiches.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">Aucune fiche à imprimer.</div>
      </div>
    )
  }

  // Aplatit (fiche, type | null) pour gérer simplement le saut de page entre
  // toutes les sous-fiches (1er saut = false, suivants = true).
  const items = []
  fiches.forEach((f) => {
    const lignes = f.lignes ?? []
    const types = ORDRE_TYPES_JEU.filter((t) => lignes.some((l) => l.typeJeu === t))
    if (types.length === 0) items.push({ fiche: f, type: null })
    else types.forEach((t) => items.push({ fiche: f, type: t }))
  })

  return (
    <div className="page imprimer-fiches">
      <div className="page-header no-print">
        <div className="page-header-left">
          <h1>{`Aperçu avant impression — ${fiches.length} fiche${fiches.length > 1 ? 's' : ''}`}</h1>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/accueil')}>
            Retour
          </button>
          <button className="btn btn-primary" onClick={lancerImpression}>
            Imprimer
          </button>
        </div>
      </div>

      {items.map(({ fiche, type }, i) => (
        <Fragment key={`${fiche.id}-${type ?? 'all'}`}>
          <FichePapier fiche={fiche} typeFiltre={type} pageBreakBefore={i > 0} />
          <div className="no-print fiche-detail-print-actions">
            <button className="btn btn-primary" onClick={() => imprimerSousFiche(fiche, type)}>
              Imprimer cette fiche
            </button>
          </div>
        </Fragment>
      ))}
    </div>
  )
}
