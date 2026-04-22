import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listFiches } from '../api/fiches.js'
import DateInput from '../components/DateInput.jsx'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatEur(value) {
  if (value == null || value === 0) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatTime(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export default function Accueil() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateDebut, setDateDebut] = useState(today())
  const [dateFin, setDateFin] = useState(today())
  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listFiches({ dateDebut, dateFin, search })
      setFiches(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [dateDebut, dateFin, search])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  return (
    <div className="page">
      {/* Filters */}
      <div className="accueil-filters">
        <div className="search-bar" style={{ flex: 1 }}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Rechercher par un nom, prénom, une description physique …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="date-input-wrapper">
          <CalendarIcon />
          <DateInput value={dateDebut} onChange={setDateDebut} />
        </div>
        <span className="date-separator">au</span>
        <div className="date-input-wrapper">
          <CalendarIcon />
          <DateInput value={dateFin} onChange={setDateFin} />
        </div>
      </div>

      {/* Section header */}
      <div className="accueil-section-header">
        <h2>Fiches du jour</h2>
        <div className="accueil-section-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/clients')}>
            Voir les clients
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/fiches/identification')}>
            + Ajouter une fiche
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Chargement…</div>
      ) : fiches.length === 0 ? (
        <div className="empty-state">Aucune fiche pour cette période.</div>
      ) : (
        <div className="fiches-grid">
          {fiches.map((f) => (
            <div key={f.id} className="fiche-card">
              <div className="fiche-card-name" title={f.clientLibelle}>
                {f.clientLibelle}
              </div>
              <div className="fiche-card-row">
                <span>Montant RGM :</span>
                <span>{formatEur(f.totalRGM)}</span>
              </div>
              <div className="fiche-card-row">
                <span>Change entrant :</span>
                <span>{formatEur(f.totalEntrant)}</span>
              </div>
              <div className="fiche-card-row">
                <span>Change sortant :</span>
                <span>{formatEur(f.totalSortant)}</span>
              </div>
              <div className="fiche-card-footer">
                <span className="fiche-card-footer-time">
                  Dernière modification : {formatTime(f.derniereModif)}
                </span>
                <div className="fiche-card-footer-actions">
                  <button
                    className="btn-icon"
                    title="Modifier"
                    onClick={() => navigate(`/fiches/${f.id}/modifier`)}
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="btn-icon"
                    title="Voir le détail"
                    onClick={() => navigate(`/fiches/${f.id}`)}
                  >
                    <EyeIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
