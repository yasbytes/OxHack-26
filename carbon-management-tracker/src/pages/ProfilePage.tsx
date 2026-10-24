import { useAuth } from '../context/AuthContext'
import Signout from '../components/Signout'

function ProfilePage() {
  const { session } = useAuth()
  if (!session) return null
  const user = session.user
  const name = typeof user.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim() : user.email?.split('@')[0] || 'there'

  return (
    <main className="main">
      <header className="header"><h1 className="header__greeting">Your account</h1></header>
      <section className="card account">
        <h2 className="card__title">{name}</h2>
        <p className="account__email">{user.email}</p>
        <p>Your activity history is saved for this account in this browser.</p>
        <Signout />
      </section>
    </main>
  )
}

export default ProfilePage

