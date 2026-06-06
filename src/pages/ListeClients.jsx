import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listClients } from '../api/clients.js'
import { texteChampsManquants } from '../utils/champsClient.js'
import { SearchIcon, EyeIcon } from '../components/Icons.jsx'
import { formatDateFr } from '../utils/formatters.js'

export default function ListeClients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [seulementIncomplets, setSeulementIncomplets] = useState(false)
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

  // Filtre côté client : laisse le tri serveur intact mais permet d'isoler
  // visuellement les profils à compléter (cas d'usage métier : régularisation
  // des fiches importées en masse).
  const clientsAffiches = seulementIncomplets
    ? clients.filter((c) => c.complet === false)
    : clients
  const nbIncomplets = clients.filter((c) => c.complet === false).length

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

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={seulementIncomplets}
          onChange={(e) => setSeulementIncomplets(e.target.checked)}
        />
        <span>
          Afficher uniquement les profils à compléter
          {nbIncomplets > 0 && (
            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
              ({nbIncomplets} sur {clients.length})
            </span>
          )}
        </span>
      </label>

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
              {clientsAffiches.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {seulementIncomplets ? 'Aucun profil incomplet.' : 'Aucun client trouvé.'}
                  </td>
                </tr>
              ) : (
                clientsAffiches.map((c) => (
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
                    <td>{formatDateFr(c.dateNaissance)}</td>
                    <td>{c.ville || '-'}</td>
                    <td>{c.pays || '-'}</td>
                    <td>{formatDateFr(c.derniereActivite)}</td>
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
