import { useActionState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Signout() {
  const { signOutUser } = useAuth()
  const navigate = useNavigate()

  async function handleSignout(): Promise<string | null> {
    const { success, error } = await signOutUser()
    if (!success) return error ?? 'Unable to log out. Please try again.'
    void navigate('/', { replace: true })
    return null
  }

  const [error, submitAction, isPending] = useActionState(handleSignout, null)
  return (
    <form action={submitAction} aria-busy={isPending}>
      {error && <p className="login__notice login__notice--error" role="alert">{error}</p>}
      <button type="submit" className="login__submit account__signout" disabled={isPending}>
        {isPending ? 'Logging out…' : 'Log out'}
      </button>
    </form>
  )
}

export default Signout

