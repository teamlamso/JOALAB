import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { listUtilisateurs, updateUtilisateur } from '../api/utilisateurs.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotify } from '../context/NotificationContext.jsx'
import { peutModifierUtilisateur } from '../utils/permissions.js'

const ROLES = [
  { value: 'CAISSIER',           label: 'Caissier' },
  { value: 'RESPONSABLE_CAISSE', label: 'Responsable caisse' },
  { value: 'MCD',                label: 'MCD' },
]

/**
 * Édition d'un utilisateur applicatif existant. Réservé aux MCD.
 *
 * <p>Modifie l'identifiant, le nom, le prénom et le rôle. Le mot de passe
 * dispose d'un parcours dédié (non implémenté ici).
 */
export default function EditUtilisateur() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useNotify()
  const { user } = useAuth()

  const [form, setForm]       = useState(null)
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // Garde-fou client : seuls les MCD peuvent atterrir ici. La vraie protection
  // est côté backend (403).
  useEffect(() => {
    if (user && !peutModifierUtilisateur(user.role)) {
      navigate('/accueil', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    // Si l'appelant a passé l'utilisateur dans le state du router, on évite un appel.
    const initial = location.state?.utilisateur
    if (initial && String(initial.id) === String(id)) {
      hydrate(initial)
      setLoading(false)
      return
    }
    // Sinon, on récupère la liste (l'API ne fournit pas de GET /{id}) et on filtre.
    listUtilisateurs({ includeArchives: true })
      .then((liste) => {
        const u = liste.find((x) => String(x.id) === String(id))
        if (!u) {
          setError('Utilisateur introuvable.')
        } else {
          hydrate(u)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, location.state])

  function hydrate(u) {
    const init = {
      identifiant: u.identifiant || '',
      nom:         u.nom || '',
      prenom:      u.prenom || '',
      role:        u.role || 'CAISSIER',
    }
    setForm(init)
    setOriginal({ ...init, archive: !!u.archive })
  }

  const set = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      // PATCH : on n'envoie que les champs réellement modifiés.
      const diff = {}
      for (const k of ['identifiant', 'nom', 'prenom', 'role']) {
        if (form[k] !== original[k]) diff[k] = form[k]
      }
      if (Object.keys(diff).length === 0) {
        notify('Aucune modification', 'info')
        navigate('/utilisateurs')
        return
      }
      await updateUtilisateur(id, diff)
      notify('Utilisateur mis à jour', 'success')
      navigate('/utilisateurs')
    } catch (err) {
      setError(err.message)
      notify(`Erreur : ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Chargement…</div>
  if (error && !form) return <div className="page"><div className="alert-error">{error}</div></div>
  if (!form) return null

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Modifier l'utilisateur :</h1>
          {original?.archive && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Ce compte est archivé : restaurez-le avant toute modification.
            </p>
          )}
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/utilisateurs')}>
            Retour
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={submit}>
        <div className="form-section">
          <div className="form-section-title">Identifiant :</div>
          <div className="form-group">
            <label>Identifiant :</label>
            <input
              type="text"
              value={form.identifiant}
              onChange={set('identifiant')}
              required
              autoComplete="off"
              disabled={original?.archive}
            />
          </div>

          <div className="form-section-title" style={{ marginTop: '16px' }}>État civil :</div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Nom :</label>
              <input
                type="text"
                value={form.nom}
                onChange={set('nom')}
                required
                disabled={original?.archive}
              />
            </div>
            <div className="form-group">
              <label>Prénom :</label>
              <input
                type="text"
                value={form.prenom}
                onChange={set('prenom')}
                required
                disabled={original?.archive}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Rôle :</label>
            <select
              value={form.role}
              onChange={set('role')}
              required
              disabled={original?.archive}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {user && String(user.id) === String(id) && form.role !== 'MCD' && (
              <small style={{ color: 'var(--color-danger, #c0392b)' }}>
                Vous ne pouvez pas vous retirer votre propre rôle MCD.
              </small>
            )}
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || original?.archive}
          >
            {saving ? 'Enregistrement …' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
