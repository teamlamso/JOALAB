import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listJournal } from '../api/journal.js'
import { useAuth } from '../context/AuthContext.jsx'

const ACTION_LABELS = {
  CONNEXION:    'Connexion',
  DECONNEXION:  'Déconnexion',
  CREATION:     'Création',
  MODIFICATION: 'Modification',
  SUPPRESSION:  'Suppression',
}

const ENTITE_LABELS = {
  FICHE:       'Fiche',
  CLIENT:      'Client',
  UTILISATEUR: 'Utilisateur',
}

function actionClass(action) {
  switch (action) {
    case 'CREATION':     return 'badge-action badge-action-creation'
    case 'MODIFICATION': return 'badge-action badge-action-modification'
    case 'SUPPRESSION':  return 'badge-action badge-action-suppression'
    case 'CONNEXION':
    case 'DECONNEXION':  return 'badge-action badge-action-session'
    default:             return 'badge-action'
  }
}

export default function Journal() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Garde-fou client : MCD uniquement.
  useEffect(() => {
    if (user && user.role !== 'MCD') navigate('/accueil', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    listJournal()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Journal d'audit</h1>
          <p>Les {entries.length} dernières actions enregistrées sur l'application.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/accueil')}>
            Retour
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Chargement…</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucune action enregistrée.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td><code>{e.horodatage}</code></td>
                    <td>
                      {e.utilisateurNom || '—'}
                      {e.utilisateurIdentifiant && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {e.utilisateurIdentifiant}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={actionClass(e.action)}>{ACTION_LABELS[e.action] || e.action}</span>
                    </td>
                    <td>
                      <div>{ENTITE_LABELS[e.typeEntite] || e.typeEntite}{e.entiteId != null ? ` #${e.entiteId}` : ''}</div>
                      {e.libelleEntite && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{e.libelleEntite}</div>
                      )}
                    </td>
                    <td>{e.description || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
