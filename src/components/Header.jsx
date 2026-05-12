import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import logoJOA from '../assets/logoJOA.svg'

function formatRole(role) {
  switch (role) {
    case 'CAISSIER': return 'Caissier'
    case 'RESPONSABLE_CAISSE': return 'Responsable caisse'
    case 'MCD': return 'MCD'
    default: return role
  }
}

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const fullName = user ? `${user.prenom} ${user.nom}` : ''

  return (
    <header className="header">
      <Link to="/accueil" className="header-logo" style={{ textDecoration: 'none' }}>
        <img src={logoJOA} alt="JOA" width="48" height="48" />
      </Link>

      <Link to="/accueil" className="header-title" style={{ textDecoration: 'none', color: 'inherit' }}>JOA LAB-FT</Link>

      {user && (
        <div className="header-user" ref={ref} onClick={() => setOpen((o) => !o)}>
          <span className="header-user-role">{formatRole(user.role)}</span>
          <span className="header-user-name">
            {fullName}
            <svg viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L1 3h10L6 8z"/>
            </svg>
          </span>
          {open && (
            <div className="header-dropdown">
              {(user.role === 'MCD' || user.role === 'RESPONSABLE_CAISSE') && (
                <button onClick={() => { setOpen(false); navigate('/utilisateurs') }}>
                  Utilisateurs
                </button>
              )}
              {(user.role === 'MCD' || user.role === 'RESPONSABLE_CAISSE') && (
                <button onClick={() => { setOpen(false); navigate('/clients/import') }}>
                  Importer des clients
                </button>
              )}
              {user.role === 'MCD' && (
                <button onClick={() => { setOpen(false); navigate('/journal') }}>
                  Journal d'audit
                </button>
              )}
              <button onClick={handleLogout}>Se déconnecter</button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
