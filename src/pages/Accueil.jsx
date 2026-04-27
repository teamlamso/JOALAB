import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listFiches } from '../api/fiches.js'
import DatePickerInput from '../components/DatePickerInput.jsx'

/** Journée de travail courante (06h00→05h59 le lendemain). */
function workDay() {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

function workDayYesterday() {
  const d = new Date(workDay())
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function formatEur(value) {
  if (value == null || value === 0) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatTime(val) {
  if (!val) return '-'
  return val
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
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

function isOver2000(f) {
  return ((f.totalEntrant || 0) + (f.totalSortant || 0)) >= 2000
}

function FicheCard({ f, navigate, showDate, highlight }) {
  const jour = workDay()
  const isToday = f.date === jour
  const totalRGMEntrant = (f.totalRGM || 0) + (f.totalEntrant || 0)

  return (
    <div className={`fiche-card${highlight ? ' fiche-card-alert' : ''}`}
      <div className="fiche-card-name" title={f.clientLibelle}>
        {f.clientLibelle}
        {showDate && <span className="fiche-card-date">{f.date ? formatDateFr(f.date) : ''}</span>}
      </div>
      {isToday ? (
        <>
          <div className="fiche-card-row">
            <span>Montant RGM :</span>
            <span>{formatEur(f.totalRGM)}</span>
          </div>
          <div className="fiche-card-row">
            <span>Change entrant :</span>
            <span>{formatEur(f.totalEntrant)}</span>
          </div>
        </>
      ) : (
        <div className="fiche-card-row">
          <span>RGM + Entrant :</span>
          <span>{formatEur(totalRGMEntrant || null)}</span>
        </div>
      )}
      <div className="fiche-card-row">
        <span>Change sortant :</span>
        <span>{formatEur(f.totalSortant)}</span>
      </div>
      <div className="fiche-card-footer">
        <span className="fiche-card-footer-time">
          Dernière modification : {formatTime(f.derniereModif)}
        </span>
        <div className="fiche-card-footer-actions">
          <button className="btn-icon" title="Modifier" onClick={() => navigate(`/fiches/${f.id}/modifier`)}>
            <EditIcon />
          </button>
          <button className="btn-icon" title="Voir le détail" onClick={() => navigate(`/fiches/${f.id}`)}>
            <EyeIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDateFr(iso) {
  if (!iso) return ''
  try {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return iso
  }
}

export default function Accueil() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateDebut, setDateDebut] = useState(workDayYesterday())
  const [dateFin, setDateFin] = useState(workDay())
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

  const jour = workDay()
  const hier = workDayYesterday()

  // Séparation : fiches du jour vs fiches de la veille/antérieures
  const fichesJour = fiches.filter((f) => f.date === jour)
  const fichesVeille = fiches.filter((f) => f.date !== jour)

  // Sur la veille : séparer les > 2000€
  const veilleOver = fichesVeille.filter(isOver2000)
  const veilleUnder = fichesVeille.filter((f) => !isOver2000(f))

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
        <DatePickerInput value={dateDebut} onChange={setDateDebut} />
        <span className="date-separator">au</span>
        <DatePickerInput value={dateFin} onChange={setDateFin} />
      </div>

      {/* Section header */}
      <div className="accueil-section-header">
        <h2>Fiches récentes</h2>
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
        <>
          {/* ── Fiches du jour ── */}
          {fichesJour.length > 0 && (
            <div className="fiches-section">
              <h3 className="fiches-section-title">
                {"Fiches du jour (" + fichesJour.length + ")"}
              </h3>
              <div className="fiches-grid">
                {fichesJour.map((f) => (
                  <FicheCard key={f.id} f={f} navigate={navigate} showDate={false} />
                ))}
              </div>
            </div>
          )}

          {/* ── Fiches de la veille / antérieures ── */}
          {fichesVeille.length > 0 && (
            <div className="fiches-section">
              <h3 className="fiches-section-title">
                {"Fiches de la veille (" + fichesVeille.length + ")"}
              </h3>

              {/* > 2000€ en haut */}
              {veilleOver.length > 0 && (
                <>
                  <h4 className="fiches-subsection-title fiches-subsection-title-alert">
                    {"Dépassant 2 000 € (" + veilleOver.length + ")"}
                  </h4>
                  <div className="fiches-grid">
                    {veilleOver.map((f) => (
                      <FicheCard key={f.id} f={f} navigate={navigate} showDate={f.date !== hier} highlight />
                    ))}
                  </div>
                </>
              )}

              {/* Autres */}
              {veilleUnder.length > 0 && (
                <>
                  {veilleOver.length > 0 && (
                    <h4 className="fiches-subsection-title">
                      {"Autres (" + veilleUnder.length + ")"}
                    </h4>
                  )}
                  <div className="fiches-grid">
                    {veilleUnder.map((f) => (
                      <FicheCard key={f.id} f={f} navigate={navigate} showDate={f.date !== hier} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
