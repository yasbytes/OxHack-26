import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// This controls the UI. Database authorization still requires Supabase RLS.
function ProtectedRoute() {
  const { session } = useAuth()
  const location = useLocation()

  if (session === undefined) return <main className="login"><p role="status">Loading your account…</p></main>
  if (!session) return <Navigate to="/" replace state={{ from: location.pathname + location.search }} />
  return <Outlet key={session.user.id} />
}

export default ProtectedRoute

