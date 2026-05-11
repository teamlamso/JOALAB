import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listFiches } from '../api/fiches.js'
import { listClients } from '../api/clients.js'
import DatePickerInput from '../components/DatePickerInput.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { peutModifierFiche } from '../utils/permissions.js'

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

function formatLastModif(date, time) {
  if (!time) return '-'
  if (!date) return time
  const jour = workDay()
  const hier = workDayYesterday()
  if (date === jour) return time
  if (date === hier) return `hier à ${time}`
  const [, m, d] = date.split('-')
  return `${d}/${m} à ${time}`
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
  return (Number(f.totalEntrant) || 0) >= 2000 || (Number(f.totalSortant) || 0) >= 2000
}

// Affiche dans un ordre fixe (MAS → JTE → JT) un badge par type présent.
function BadgesJeu({ types }) {
  if (!types || types.length === 0) return null
  const ordre = ['MAS', 'JTE', 'JT']
  return (
    <>
      {ordre.filter((t) => types.includes(t)).map((t) => {
        const cls = t === 'MAS' ? 'badge-jeu-mas'
                  : t === 'JTE' ? 'badge-jeu-jte'
                  : 'badge-jeu-jt'
        return <span key={t} className={`badge-jeu ${cls}`}>{t}</span>
      })}
    </>
  )
}

function FicheCard({ f, navigate, showDate, highlight, role }) {
  const jour = workDay()
  const isToday = f.date === jour
  const totalRGMEntrant = (f.totalRGM || 0) + (f.totalEntrant || 0)
  const peutModifier = peutModifierFiche(role, f.date)

  return (
    <div className={`fiche-card${highlight ? ' fiche-card-alert' : ''}`}>
      <div className="fiche-card-name" title={f.clientLibelle}>
        <span className="fiche-card-name-text">
          <span className="fiche-card-libelle">{f.clientLibelle}</span>
          <BadgesJeu types={f.typesJeu} />
          {f.clientPpe && <span className="badge-ppe" title="Personne Politiquement Exposée">PPE</span>}
        </span>
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
          Dernière modification : {formatLastModif(f.date, f.derniereModif)}
        </span>
        <div className="fiche-card-footer-actions">
          {peutModifier && (
            <button className="btn-icon" title="Modifier" onClick={() => navigate(`/fiches/${f.id}/modifier`)}>
              <EditIcon />
            </button>
          )}
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

function ClientCard({ c, navigate }) {
  return (
    <div className="fiche-card client-card-search" onClick={() => navigate(`/clients/${c.id}`)} style={{ cursor: 'pointer' }}>
      <div className="fiche-card-name" title={c.libelle}>
        <span className="fiche-card-name-text">
          <span className="fiche-card-libelle">{c.libelle}</span>
          {c.ppe && <span className="badge-ppe" title="Personne Politiquement Exposée">PPE</span>}
        </span>
      </div>
      {c.dateNaissance && (
        <div className="fiche-card-row">
          <span>Né(e) le :</span>
          <span>{formatDateFr(c.dateNaissance)}</span>
        </div>
      )}
      {(c.ville || c.pays) && (
        <div className="fiche-card-row">
          <span>Localité :</span>
          <span>{[c.ville, c.pays].filter(Boolean).join(', ')}</span>
        </div>
      )}
      {c.derniereActivite && (
        <div className="fiche-card-row">
          <span>Dernière activité :</span>
          <span>{formatDateFr(c.derniereActivite)}</span>
        </div>
      )}
    </div>
  )
}

export default function Accueil() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [dateDebut, setDateDebut] = useState(workDayYesterday())
  const [dateFin, setDateFin] = useState(workDay())
  const [fiches, setFiches] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const fichesPromise = listFiches({ dateDebut, dateFin, search })
      const clientsPromise = search.trim() ? listClients(search) : Promise.resolve([])
      const [fichesData, clientsData] = await Promise.all([fichesPromise, clientsPromise])
      setFiches(fichesData)
      setClients(clientsData)
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
      ) : fiches.length === 0 && clients.length === 0 ? (
        <div className="empty-state">
          {search.trim() ? 'Aucune fiche ni client correspondant.' : 'Aucune fiche pour cette période.'}
        </div>
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
                  <FicheCard key={f.id} f={f} navigate={navigate} showDate={false} role={user?.role} />
                ))}
              </div>
            </div>
          )}

          {/* ── Fiches de la veille / antérieures ── */}
          {fichesVeille.length > 0 && (
            <div className="fiches-section">
              <div className="fiches-section-title-row">
                <h3 className="fiches-section-title">
                  {"Fiches de la veille (" + fichesVeille.length + ")"}
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const ids = fichesVeille.map((f) => f.id).join(',')
                    navigate(`/fiches/imprimer?ids=${ids}`)
                  }}
                >
                  Visualiser toutes les fiches de la veille
                </button>
              </div>

              {/* > 2000€ en haut */}
              {veilleOver.length > 0 && (
                <>
                  <h4 className="fiches-subsection-title fiches-subsection-title-alert">
                    {"Dépassant 2 000 € (" + veilleOver.length + ")"}
                  </h4>
                  <div className="fiches-grid">
                    {veilleOver.map((f) => (
                      <FicheCard key={f.id} f={f} navigate={navigate} showDate={f.date !== hier} highlight role={user?.role} />
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
                      <FicheCard key={f.id} f={f} navigate={navigate} showDate={f.date !== hier} role={user?.role} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Clients correspondants à la recherche ── */}
          {search.trim() && clients.length > 0 && (
            <div className="fiches-section">
              <h3 className="fiches-section-title">
                {"Clients correspondants (" + clients.length + ")"}
              </h3>
              <div className="fiches-grid">
                {clients.map((c) => (
                  <ClientCard key={c.id} c={c} navigate={navigate} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
