import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getFiche } from '../api/fiches.js'
import FichePapierMulti from '../components/FichePapierMulti.jsx'

/** Page d'impression groupée. Reçoit `?ids=1,2,3`, charge toutes les fiches
 *  et déclenche l'impression dès que le rendu est prêt. */
export default function ImprimerFiches() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const idsParam = params.get('ids') || ''
  const ids = idsParam.split(',').filter(Boolean)

  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const printedRef = useRef(false)

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

  // Lance l'impression une fois tout chargé (une seule fois).
  useEffect(() => {
    if (!loading && fiches.length > 0 && !printedRef.current) {
      printedRef.current = true
      const previous = document.title
      document.title = `Fiches_${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}`
      const restore = () => {
        document.title = previous
        window.removeEventListener('afterprint', restore)
      }
      window.addEventListener('afterprint', restore)
      // Petite tempo pour laisser le navigateur peindre toutes les fiches
      setTimeout(() => window.print(), 200)
    }
  }, [loading, fiches])

  if (loading) return <div className="loading">Chargement…</div>
  if (error) return <div className="page"><div className="alert-error">{error}</div></div>
  if (fiches.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">Aucune fiche à imprimer.</div>
      </div>
    )
  }

  return (
    <div className="page imprimer-fiches">
      <div className="page-header no-print">
        <div className="page-header-left">
          <h1>{`Impression de ${fiches.length} fiche${fiches.length > 1 ? 's' : ''}`}</h1>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/accueil')}>
            Retour
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Relancer l'impression
          </button>
        </div>
      </div>

      {fiches.map((f, i) => (
        <FichePapierMulti key={f.id} fiche={f} pageBreakBefore={i > 0} />
      ))}
    </div>
  )
}
