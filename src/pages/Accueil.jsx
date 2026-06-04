import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listFiches } from '../api/fiches.js'
import { listClients } from '../api/clients.js'
import DatePickerInput from '../components/DatePickerInput.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { peutModifierFiche } from '../utils/permissions.js'
import { texteChampsManquants } from '../utils/champsClient.js'
import { formatDateFr, formatEur, workDay, workDayYesterday } from '../utils/formatters.js'
import { SearchIcon, ClearIcon, EditIcon, EyeIcon, WarningIcon } from '../components/Icons.jsx'

function formatLastModif(date, time) {
  if (!time) return '-'
  if (!date) return time
  if (date === workDay()) return time
  if (date === workDayYesterday()) return `hier à ${time}`
  const [, m, d] = date.split('-')
  return `${d}/${m} à ${time}`
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

  // Le nom du client est cliquable : raccourci vers le profil. La zone
  // englobe le libellé + le badge PPE + le picto warning pour avoir une
  // cible large (et non un seul texte fin).
  const ouvrirClient = (e) => {
    e.stopPropagation()
    if (f.clientId) navigate(`/clients/${f.clientId}`)
  }

  return (
    <div className={`fiche-card${highlight ? ' fiche-card-alert' : ''}`}>
      <div className="fiche-card-name" title={f.clientLibelle}>
        <span
          className="fiche-card-name-text fiche-card-name-link"
          onClick={ouvrirClient}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ouvrirClient(e) }}
          title="Voir le profil du client"
          style={{ cursor: f.clientId ? 'pointer' : 'default' }}
        >
          <span className="fiche-card-libelle">{f.clientLibelle}</span>
          {f.clientComplet === false && (
            <WarningIcon
              title={
                f.clientChampsManquants && f.clientChampsManquants.length > 0
                  ? `Champs manquants : ${texteChampsManquants(f.clientChampsManquants)}`
                  : 'Le profil client a des champs manquants — à compléter'
              }
            />
          )}
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
          Dernière modification : {formatLastModif(f.derniereModifDate, f.derniereModif)}
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

function ClientCard({ c, navigate }) {
  return (
    <div className="fiche-card client-card-search" onClick={() => navigate(`/clients/${c.id}`)} style={{ cursor: 'pointer' }}>
      <div className="fiche-card-name" title={c.libelle}>
        <span className="fiche-card-name-text">
          <span className="fiche-card-libelle">{c.libelle}</span>
          {c.ppe && <span className="badge-ppe" title="Personne Politiquement Exposée">PPE</span>}
          {c.complet === false && (
            <span
              className="badge-incomplet"
              title={
                c.champsManquants && c.champsManquants.length > 0
                  ? `Champs manquants : ${texteChampsManquants(c.champsManquants)}`
                  : 'Certains champs sont manquants'
              }
            >
              À compléter
            </span>
          )}
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
  // Recherche + plage de dates vivent dans l'URL (?q=&from=&to=) : permet la
  // restauration via navigate(-1) depuis DetailFiche / DetailClient et le
  // partage par URL d'un état filtré.
  const [searchParams, setSearchParams] = useSearchParams()
  const search    = searchParams.get('q')    || ''
  const dateDebut = searchParams.get('from') || workDayYesterday()
  const dateFin   = searchParams.get('to')   || workDay()
  const patchParams = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') next.delete(k)
      else next.set(k, v)
    })
    setSearchParams(next, { replace: true })
  }
  const setSearch    = (value) => patchParams({ q: value })
  const setDateDebut = (value) => patchParams({ from: value })
  const setDateFin   = (value) => patchParams({ to: value })
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
          {search && (
            <button
              type="button"
              className="search-bar-clear"
              title="Effacer la recherche"
              onClick={() => setSearch('')}
            >
              <ClearIcon />
            </button>
          )}
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
