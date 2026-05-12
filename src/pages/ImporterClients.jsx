import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { importClients } from '../api/clients.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotify } from '../context/NotificationContext.jsx'
import { peutImporterClients } from '../utils/permissions.js'

export default function ImporterClients() {
  const navigate = useNavigate()
  const notify = useNotify()
  const { user } = useAuth()

  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Garde-fou client : seuls RESPONSABLE_CAISSE et MCD peuvent importer.
  useEffect(() => {
    if (user && !peutImporterClients(user.role)) {
      navigate('/accueil', { replace: true })
    }
  }, [user, navigate])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setResult(null)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setError('')
    setResult(null)
    setImporting(true)
    try {
      const r = await importClients(file)
      setResult(r)
      const msg = `${r.imported} client(s) importé(s)` +
                  (r.skipped ? `, ${r.skipped} doublon(s) ignoré(s)` : '') +
                  (r.incomplete ? `, ${r.incomplete} incomplet(s)` : '')
      notify(msg, r.errors?.length ? 'warning' : 'success')
    } catch (err) {
      setError(err.message)
      notify(`Erreur : ${err.message}`, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Importer des clients</h1>
          <p>
            Sélectionnez un classeur Excel (.xlsx ou .xls). Les colonnes
            reconnues sont : Prénom, Nom de famille, Date de naissance, PPE,
            PI Numéro / Pays / Ville (délivrance &amp; naissance), PI Type de
            document, PI Date de délivrance, Adresse 1. Les colonnes
            supplémentaires sont ignorées.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/clients')}>
            Retour
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-section" style={{ maxWidth: 640 }}>
        <div className="form-section-title">Fichier à importer</div>
        <div className="form-group">
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
            disabled={importing}
          />
        </div>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!file || importing}
          >
            {importing ? 'Import en cours…' : 'Importer'}
          </button>
        </div>
      </form>

      {result && (
        <div className="import-summary">
          <h3>Résultat de l'import</h3>
          <ul>
            <li><strong>{result.imported}</strong> client(s) créé(s)</li>
            <li><strong>{result.skipped}</strong> doublon(s) ignoré(s)</li>
            <li>
              <strong>{result.incomplete}</strong> client(s) marqué(s) à compléter
              <span style={{ color: 'var(--text-muted)' }}> (champs manquants — pastille « À compléter » sur la liste des clients)</span>
            </li>
          </ul>
          {result.errors && result.errors.length > 0 && (
            <>
              <h4>Erreurs détaillées</h4>
              <ul className="import-errors">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </>
          )}
          <div style={{ marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={() => navigate('/clients')}>
              Voir la liste des clients
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
