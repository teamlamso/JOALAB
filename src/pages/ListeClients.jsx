import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listClients } from '../api/clients.js'
import { texteChampsManquants } from '../utils/champsClient.js'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
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

function formatDate(iso) {
  if (!iso) return '-'
  try {
    const [y, m, d] = iso.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  } catch {
    return iso
  }
}

export default function ListeClients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setClients(await listClients(search))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestion des clients</h1>
          <p>Consultez et recherchez des clients</p>
        </div>
        <div className="page-header-actions">
          <div className="search-bar">
            <SearchIcon />
            <input
              type="text"
              placeholder="Rechercher …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/accueil')}>
            Retour
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/clients/nouveau')}>
            + Ajouter un client
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
                <th>Nom</th>
                <th>Date de naissance</th>
                <th>Ville</th>
                <th>Pays</th>
                <th>Dernière activité</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun client trouvé.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.libelle}</strong>
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
                    </td>
                    <td>{formatDate(c.dateNaissance)}</td>
                    <td>{c.ville || '-'}</td>
                    <td>{c.pays || '-'}</td>
                    <td>{formatDate(c.derniereActivite)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-icon"
                        title="Voir le profil"
                        onClick={() => navigate(`/clients/${c.id}`)}
                      >
                        <EyeIcon />
                      </button>
                    </td>
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
