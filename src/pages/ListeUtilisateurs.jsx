import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listUtilisateurs,
  archiverUtilisateur,
  desarchiverUtilisateur,
} from '../api/utilisateurs.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotify } from '../context/NotificationContext.jsx'
import { SearchIcon } from '../components/Icons.jsx'
import {
  peutModifierUtilisateur,
  peutArchiverUtilisateur,
  peutDesarchiverUtilisateur,
} from '../utils/permissions.js'

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
  const notify = useNotify()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showArchives, setShowArchives] = useState(false)
  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const peutEditer = peutModifierUtilisateur(user?.role)
  const peutArchiver = peutArchiverUtilisateur(user?.role)
  const peutDesarchiver = peutDesarchiverUtilisateur(user?.role)

  // Garde-fou client : les CAISSIER ne doivent jamais arriver ici. La vraie
  // protection est côté backend (403), ceci évite juste un appel inutile.
  useEffect(() => {
    if (user && user.role === 'CAISSIER') navigate('/accueil', { replace: true })
  }, [user, navigate])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUtilisateurs(await listUtilisateurs({ includeArchives: showArchives }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [showArchives])

  useEffect(() => { load() }, [load])

  const peutAjouter = user && (user.role === 'MCD' || user.role === 'RESPONSABLE_CAISSE')

  const terme = search.trim().toLowerCase()
  const filtres = !terme
    ? utilisateurs
    : utilisateurs.filter((u) => {
        const full = `${u.prenom} ${u.nom} ${u.identifiant}`.toLowerCase()
        return full.includes(terme)
      })

  const handleArchiver = async (u) => {
    const ok = window.confirm(
      `Archiver l'utilisateur « ${u.prenom} ${u.nom} » ?\n\n`
      + 'Le compte disparaîtra de la liste et ne pourra plus se connecter, '
      + 'mais ses fiches et entrées de journal historiques resteront intactes.'
    )
    if (!ok) return
    try {
      await archiverUtilisateur(u.id)
      notify(`${u.prenom} ${u.nom} a été archivé`, 'success')
      load()
    } catch (e) {
      notify(`Erreur : ${e.message}`, 'error')
    }
  }

  const handleDesarchiver = async (u) => {
    const ok = window.confirm(
      `Réactiver le compte de « ${u.prenom} ${u.nom} » ?\n\n`
      + 'Le compte pourra à nouveau se connecter avec son mot de passe existant.'
    )
    if (!ok) return
    try {
      await desarchiverUtilisateur(u.id)
      notify(`${u.prenom} ${u.nom} a été réactivé`, 'success')
      load()
    } catch (e) {
      notify(`Erreur : ${e.message}`, 'error')
    }
  }

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

      {peutEditer && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showArchives}
            onChange={(e) => setShowArchives(e.target.checked)}
          />
          <span>Afficher les comptes archivés</span>
        </label>
      )}

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
                {showArchives && <th>Statut</th>}
                {peutEditer && <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtres.length === 0 ? (
                <tr>
                  <td colSpan={showArchives ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filtres.map((u) => {
                  const estSoi = user && String(user.id) === String(u.id)
                  return (
                    <tr key={u.id} style={u.archive ? { opacity: 0.55 } : undefined}>
                      <td><code>{u.identifiant}</code></td>
                      <td>{u.nom}</td>
                      <td>{u.prenom}</td>
                      <td>
                        <span className={roleClass(u.role)}>{formatRole(u.role)}</span>
                      </td>
                      {showArchives && (
                        <td>
                          {u.archive
                            ? <span className="badge-role">Archivé</span>
                            : <span style={{ color: 'var(--text-muted)' }}>Actif</span>}
                        </td>
                      )}
                      {peutEditer && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={u.archive}
                              title={u.archive ? 'Compte archivé' : 'Modifier'}
                              onClick={() => navigate(`/utilisateurs/${u.id}/modifier`, { state: { utilisateur: u } })}
                            >
                              Modifier
                            </button>
                            {peutArchiver && !u.archive && (
                              <button
                                type="button"
                                className="btn btn-danger"
                                disabled={estSoi}
                                title={estSoi ? 'Vous ne pouvez pas archiver votre propre compte' : 'Archiver'}
                                onClick={() => handleArchiver(u)}
                              >
                                Archiver
                              </button>
                            )}
                            {peutDesarchiver && u.archive && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                title="Réactiver le compte"
                                onClick={() => handleDesarchiver(u)}
                              >
                                Réactiver
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
