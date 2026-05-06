import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import logoJOA from '../assets/logoJOA.svg'

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
          <img src={logoJOA} alt="JOA" width="48" height="48" />
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
