import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { listClients } from '../api/clients.js'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    const [y, m, d] = iso.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  } catch {
    return iso
  }
}

export default function Identification() {
  const navigate = useNavigate()
  const location = useLocation()
  const preselectClient = location.state?.preselectClient

  const [tab, setTab] = useState('identifie')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [description, setDescription] = useState('')

  // Auto-fill search if coming from DetailClient
  useEffect(() => {
    if (preselectClient) {
      navigate('/fiches/nouveau', { state: { clientData: { id: preselectClient.id, libelle: preselectClient.libelle, identifie: true } } })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoadingSearch(true)
    try {
      const data = await listClients(q)
      // filter to only identified clients in "identifie" tab
      setResults(tab === 'identifie' ? data.filter((c) => c.identifie !== false) : data.filter((c) => c.identifie === false))
    } catch {
      setResults([])
    } finally {
      setLoadingSearch(false)
    }
  }, [tab])

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300)
    return () => clearTimeout(t)
  }, [search, doSearch])

  const selectClient = (c) => {
    navigate('/fiches/nouveau', {
      state: { clientData: { id: c.id, libelle: c.libelle, identifie: true } },
    })
  }

  const continuerNonIdentifie = () => {
    if (!description.trim()) return
    navigate('/fiches/nouveau', {
      state: { clientData: { id: null, libelle: description, identifie: false, descriptionPhysique: description } },
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Identification :</h1>
          <p>Identifiez le client ou saisissez une description physique.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/accueil')}>
            Retour
          </button>
        </div>
      </div>

      <div className="identification-body">
        {/* Tab switch */}
        <div className="tab-switch" style={{ marginBottom: '20px' }}>
          <button
            type="button"
            className={`tab-switch-btn ${tab === 'identifie' ? 'active' : ''}`}
            onClick={() => { setTab('identifie'); setSearch(''); setResults([]) }}
          >
            Client identifié
          </button>
          <button
            type="button"
            className={`tab-switch-btn ${tab === 'non-identifie' ? 'active' : ''}`}
            onClick={() => { setTab('non-identifie'); setSearch(''); setResults([]) }}
          >
            Client non-identifié
          </button>
        </div>

        {tab === 'identifie' ? (
          <div className="identification-search">
            <div className="search-bar">
              <SearchIcon />
              <input
                type="text"
                placeholder="Rechercher par un nom, prénom, une date de naissance …"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {loadingSearch && <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Recherche…</div>}
            {search && !loadingSearch && (
              <div className="search-results">
                {results.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 8 }}>Aucun résultat.</div>
                ) : (
                  results.map((c) => (
                    <div key={c.id} className="search-result-item">
                      <div className="search-result-item-info">
                        <strong>{c.libelle}</strong>
                        {c.dateNaissance && <p>Né(e) le {formatDate(c.dateNaissance)}</p>}
                      </div>
                      <div className="search-result-item-actions">
                        <button
                          className="btn btn-secondary"
                          onClick={() => navigate(`/clients/${c.id}`)}
                        >
                          Voir le client
                        </button>
                        <button
                          className="btn btn-green"
                          onClick={() => selectClient(c)}
                        >
                          Sélectionner
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="non-identified-form">
            <div className="form-group">
              <label>Description physique :</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex : Homme, blond, tatouage bras droit, environ 40 ans…"
                rows={4}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                className="btn btn-primary"
                onClick={continuerNonIdentifie}
                disabled={!description.trim()}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        <div className="identification-footer">
          <p>Le client n'existe pas ?</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/clients/nouveau', { state: { returnTo: 'fiche' } })}
          >
            + Créer un nouveau client
          </button>
        </div>
      </div>
    </div>
  )
}
