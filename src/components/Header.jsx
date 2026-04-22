import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function JoaLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="23" stroke="#1a1a1a" strokeWidth="2" fill="white"/>
      <circle cx="24" cy="24" r="18" stroke="#1a1a1a" strokeWidth="1.5" fill="white"/>
      {/* 4-petal flower (club-like) */}
      <circle cx="24" cy="16" r="5" fill="#1a1a1a"/>
      <circle cx="24" cy="32" r="5" fill="#1a1a1a"/>
      <circle cx="16" cy="24" r="5" fill="#1a1a1a"/>
      <circle cx="32" cy="24" r="5" fill="#1a1a1a"/>
      <circle cx="24" cy="24" r="4" fill="#1a1a1a"/>
    </svg>
  )
}

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
        <JoaLogo />
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
              <button onClick={handleLogout}>Se déconnecter</button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
