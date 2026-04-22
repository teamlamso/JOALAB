import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Header from './Header.jsx'

export default function PrivateRoute() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
