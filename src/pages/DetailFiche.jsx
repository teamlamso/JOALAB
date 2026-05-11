import { Fragment, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFiche } from '../api/fiches.js'
import FichePapier from '../components/FichePapier.jsx'
import { buildPrintTitle } from '../utils/printTitle.js'

const ORDRE_TYPES = ['MAS', 'JTE', 'JT']

function formatDateFr(str) {
  if (!str) return ''
  if (str.includes('/')) return str.slice(0, 10)
  const [y, m, d] = str.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** Imprime soit toute la fiche (typeFiltre=null), soit la seule sous-fiche
 *  correspondant au type donné en ajoutant une classe au body pour masquer
 *  les autres sous-fiches via CSS @media print. */
function imprimerSousFiche(fiche, typeFiltre) {
  const previous = document.title
  const className = typeFiltre ? `print-filter-${typeFiltre.toLowerCase()}` : null
  document.title = buildPrintTitle(fiche, typeFiltre)
  if (className) document.body.classList.add(className)
  const restore = () => {
    document.title = previous
    if (className) document.body.classList.remove(className)
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

  const lignes = fiche.lignes ?? []
  const typesPresents = ORDRE_TYPES.filter((t) => lignes.some((l) => l.typeJeu === t))

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
        </div>
      </div>

      {typesPresents.length === 0 ? (
        <>
          <FichePapier fiche={fiche} />
          <div className="no-print fiche-detail-print-actions">
            <button className="btn btn-primary" onClick={() => imprimerSousFiche(fiche, null)}>
              Imprimer cette fiche
            </button>
          </div>
        </>
      ) : (
        typesPresents.map((t, i) => (
          <Fragment key={t}>
            <FichePapier fiche={fiche} typeFiltre={t} pageBreakBefore={i > 0} />
            <div className="no-print fiche-detail-print-actions">
              <button className="btn btn-primary" onClick={() => imprimerSousFiche(fiche, t)}>
                Imprimer cette fiche
              </button>
            </div>
          </Fragment>
        ))
      )}
    </div>
  )
}
