import { Fragment, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFiche } from '../api/fiches.js'
import FichePapier from '../components/FichePapier.jsx'
import HistoriqueFicheDialog from '../components/HistoriqueFicheDialog.jsx'
import { imprimerSousFiche, ORDRE_TYPES_JEU } from '../utils/print.js'

function formatDateFr(str) {
  if (!str) return ''
  if (str.includes('/')) return str.slice(0, 10)
  const [y, m, d] = str.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function DetailFiche() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fiche, setFiche] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false)

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
  const typesPresents = ORDRE_TYPES_JEU.filter((t) => lignes.some((l) => l.typeJeu === t))

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
          <button className="btn btn-secondary" onClick={() => setHistoriqueOuvert(true)}>
            Historique
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

      {historiqueOuvert && (
        <HistoriqueFicheDialog ficheId={id} onClose={() => setHistoriqueOuvert(false)} />
      )}
    </div>
  )
}
