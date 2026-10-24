import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Home() {
  const { session } = useAuth()
  const location = useLocation()
  if (session === undefined) return <main className="login"><p role="status">Loading your account…</p></main>

  if (session) {
    const from: unknown = location.state?.from
    const destination = typeof from === 'string' && (from === '/dashboard' || from.startsWith('/dashboard/') || from.startsWith('/dashboard?'))
      ? from : '/dashboard'
    return <Navigate to={destination} replace />
  }
  return <Outlet />
}

export default Home

