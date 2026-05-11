import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUtilisateur } from '../api/utilisateurs.js'
import { useAuth } from '../context/AuthContext.jsx'

const ROLE_LABELS = {
  CAISSIER:           'Caissier',
  RESPONSABLE_CAISSE: 'Responsable caisse',
  MCD:                'MCD',
}

/** Rôles que {@code currentRole} a le droit de créer. Doit refléter la matrice
 *  côté backend (PermissionService.peutCreerUtilisateur). */
function rolesCreables(currentRole) {
  if (currentRole === 'MCD')                return ['CAISSIER', 'RESPONSABLE_CAISSE', 'MCD']
  if (currentRole === 'RESPONSABLE_CAISSE') return ['CAISSIER']
  return []
}

export default function NouveauUtilisateur() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const rolesPossibles = rolesCreables(user?.role)

  const [form, setForm] = useState({
    identifiant: '',
    motDePasse:  '',
    nom:         '',
    prenom:      '',
    role:        rolesPossibles[0] || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Garde-fou client : ni CAISSIER, ni utilisateur non connecté ne peut être ici.
  // La vraie sécurité est côté backend (403).
  useEffect(() => {
    if (!user || rolesPossibles.length === 0) navigate('/accueil', { replace: true })
  }, [user, rolesPossibles.length, navigate])

  const set = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createUtilisateur(form)
      navigate('/utilisateurs')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (rolesPossibles.length === 0) return null

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Nouvel utilisateur :</h1>
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
          <div className="form-section-title">Identifiants :</div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Identifiant :</label>
              <input
                type="text"
                value={form.identifiant}
                onChange={set('identifiant')}
                required
                autoComplete="off"
                placeholder="ex : aduchat"
              />
            </div>
            <div className="form-group">
              <label>Mot de passe :</label>
              <input
                type="password"
                value={form.motDePasse}
                onChange={set('motDePasse')}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-section-title" style={{ marginTop: '16px' }}>État civil :</div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Nom :</label>
              <input type="text" value={form.nom} onChange={set('nom')} required />
            </div>
            <div className="form-group">
              <label>Pr&eacute;nom :</label>
              <input type="text" value={form.prenom} onChange={set('prenom')} required />
            </div>
          </div>

          <div className="form-group">
            <label>R&ocirc;le :</label>
            <select value={form.role} onChange={set('role')} required>
              {rolesPossibles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Création …' : 'Créer l\'utilisateur'}
          </button>
        </div>
      </form>
    </div>
  )
}
