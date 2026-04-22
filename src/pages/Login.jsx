import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'

function JoaLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="23" stroke="#1a1a1a" strokeWidth="2" fill="white"/>
      <circle cx="24" cy="24" r="18" stroke="#1a1a1a" strokeWidth="1.5" fill="white"/>
      <circle cx="24" cy="16" r="5" fill="#1a1a1a"/>
      <circle cx="24" cy="32" r="5" fill="#1a1a1a"/>
      <circle cx="16" cy="24" r="5" fill="#1a1a1a"/>
      <circle cx="32" cy="24" r="5" fill="#1a1a1a"/>
      <circle cx="24" cy="24" r="4" fill="#1a1a1a"/>
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(identifiant, motDePasse)
      signIn(res)
      navigate('/accueil')
    } catch {
      setError('Identifiant ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="login-header-logo">
          <JoaLogo />
        </div>
        <span className="login-title">JOA LAB-FT</span>
      </header>

      <div className="login-body">
        <div className="login-card">
          <h2>Se connecter</h2>
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="identifiant">Identifiant :</label>
              <input
                id="identifiant"
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                autoFocus
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="motDePasse">Mot de passe :</label>
              <input
                id="motDePasse"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
