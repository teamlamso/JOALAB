import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listUtilisateurs } from '../api/utilisateurs.js'
import { useAuth } from '../context/AuthContext.jsx'
import { SearchIcon } from '../components/Icons.jsx'

function formatRole(role) {
  switch (role) {
    case 'CAISSIER':           return 'Caissier'
    case 'RESPONSABLE_CAISSE': return 'Responsable caisse'
    case 'MCD':                return 'MCD'
    default: return role
  }
}

function roleClass(role) {
  switch (role) {
    case 'MCD':                return 'badge-role badge-role-mcd'
    case 'RESPONSABLE_CAISSE': return 'badge-role badge-role-responsable'
    case 'CAISSIER':           return 'badge-role badge-role-caissier'
    default: return 'badge-role'
  }
}

export default function ListeUtilisateurs() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Garde-fou client : les CAISSIER ne doivent jamais arriver ici. La vraie
  // protection est côté backend (403), ceci évite juste un appel inutile.
  useEffect(() => {
    if (user && user.role === 'CAISSIER') navigate('/accueil', { replace: true })
  }, [user, navigate])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUtilisateurs(await listUtilisateurs())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const peutAjouter = user && (user.role === 'MCD' || user.role === 'RESPONSABLE_CAISSE')

  const terme = search.trim().toLowerCase()
  const filtres = !terme
    ? utilisateurs
    : utilisateurs.filter((u) => {
        const full = `${u.prenom} ${u.nom} ${u.identifiant}`.toLowerCase()
        return full.includes(terme)
      })

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestion des utilisateurs</h1>
          <p>Comptes des employés ayant accès à l'application.</p>
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
          {peutAjouter && (
            <button className="btn btn-primary" onClick={() => navigate('/utilisateurs/nouveau')}>
              + Ajouter un utilisateur
            </button>
          )}
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
                <th>Identifiant</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {filtres.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filtres.map((u) => (
                  <tr key={u.id}>
                    <td><code>{u.identifiant}</code></td>
                    <td>{u.nom}</td>
                    <td>{u.prenom}</td>
                    <td>
                      <span className={roleClass(u.role)}>{formatRole(u.role)}</span>
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
