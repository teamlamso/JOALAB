import { useEffect, useState } from 'react'
import { getHistoriqueFiche } from '../api/journal.js'

const ACTION_LABELS = {
  CREATION:     'Création',
  MODIFICATION: 'Modification',
  SUPPRESSION:  'Suppression',
}

function actionClass(action) {
  switch (action) {
    case 'CREATION':     return 'badge-action badge-action-creation'
    case 'MODIFICATION': return 'badge-action badge-action-modification'
    case 'SUPPRESSION':  return 'badge-action badge-action-suppression'
    default:             return 'badge-action'
  }
}

/**
 * Modale affichant l'historique d'audit d'une fiche (création, modifications,
 * suppression éventuelle). Liste les entrées du plus récent au plus ancien.
 */
export default function HistoriqueFicheDialog({ ficheId, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getHistoriqueFiche(ficheId)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [ficheId])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Historique de la fiche #{ficheId}</div>

        <div className="modal-body">
          {error && <div className="alert-error">{error}</div>}

          {loading ? (
            <div className="loading">Chargement…</div>
          ) : entries.length === 0 ? (
            <div className="empty-state">Aucune action enregistrée pour cette fiche.</div>
          ) : (
            <ol className="historique-list">
              {entries.map((e) => (
                <li key={e.id} className="historique-item">
                  <div className="historique-item-head">
                    <span className={actionClass(e.action)}>{ACTION_LABELS[e.action] || e.action}</span>
                    <span className="historique-item-meta">
                      {e.horodatage}
                      {' — '}
                      {e.utilisateurNom || 'utilisateur inconnu'}
                    </span>
                  </div>
                  {e.description && (
                    <div className="historique-item-desc" style={{ whiteSpace: 'pre-line' }}>
                      {e.description}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
