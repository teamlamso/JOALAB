import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFiche } from '../api/fiches.js'
import FichePapierMulti from '../components/FichePapierMulti.jsx'
import { buildPrintTitle } from '../utils/printTitle.js'

function formatDateFr(str) {
  if (!str) return ''
  if (str.includes('/')) return str.slice(0, 10)
  const [y, m, d] = str.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function imprimerFiche(fiche) {
  const previous = document.title
  document.title = buildPrintTitle(fiche)
  const restore = () => {
    document.title = previous
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}

export default function DetailFiche() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fiche, setFiche] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getFiche(id)
      .then(setFiche)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Chargement…</div>
  if (error) return <div className="page"><div className="alert-error">{error}</div></div>
  if (!fiche) return null

  return (
    <div className="page">
      <div className="page-header no-print">
        <div className="page-header-left">
          <h1>Détail de la fiche</h1>
          <p>
            Créée le {formatDateFr(fiche.date) || '-'} par {fiche.creePar}
            {fiche.dateModification && (
              <> — Modifiée le {fiche.dateModification} par {fiche.modifiePar}</>
            )}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/accueil')}>
            Retour
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/fiches/${id}/modifier`)}>
            Compléter la fiche
          </button>
          <button className="btn btn-primary" onClick={() => imprimerFiche(fiche)}>
            Imprimer
          </button>
        </div>
      </div>

      <FichePapierMulti fiche={fiche} />
    </div>
  )
}
