import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Home() {
  const { session, recovering } = useAuth()
  const location = useLocation()
  if (session === undefined) return <main className="login"><p role="status">Loading your account…</p></main>

  // A reset link that lands here still needs a new password before anything else
  if (session && recovering) return <Navigate to="/reset-password" replace />
  if (session) {
    const from: unknown = location.state?.from
    const destination = typeof from === 'string' && (from === '/dashboard' || from.startsWith('/dashboard/') || from.startsWith('/dashboard?'))
      ? from : '/dashboard'
    return <Navigate to={destination} replace />
  }
  return <Outlet />
}

export default Home

