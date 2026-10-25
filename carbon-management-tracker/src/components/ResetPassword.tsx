import { useActionState, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import eyeIcon from '../assets/icons/eye.svg'

// Where the reset email's link lands; Supabase signs the person in from the link first
function ResetPassword() {
  const { session, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(_previousState: string | null, formData: FormData): Promise<string | null> {
    const password = String(formData.get('password') ?? '')
    const confirmation = String(formData.get('confirmation') ?? '')
    if (password.length < 8) return 'Use at least 8 characters for your password.'
    if (password !== confirmation) return 'Your passwords do not match.'
    const { success, error } = await updatePassword(password)
    if (!success) return error ?? 'Unable to save your new password. Please try again.'
    void navigate('/dashboard', { replace: true })
    return null
  }

  const [error, submitAction, isPending] = useActionState(handleSubmit, null)

  if (session === undefined) return <main className="login"><p role="status">Checking your reset link…</p></main>

  if (!session) {
    return (
      <main className="login">
        <div className="login__card">
          <p className="login__brand">Future Earth</p>
          <h1 className="login__title">This link has expired</h1>
          <p className="login__notice login__notice--error" role="alert">
            Reset links only work once and for a short time. Ask for a new one below.
          </p>
          <Link className="login__submit login__submit--link" to="/forgot-password">Send a new link</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="login">
      <form className="login__card" action={submitAction} aria-busy={isPending}>
        <p className="login__brand">Future Earth</p>
        <div>
          <h1 className="login__title">Choose a new password</h1>
          <p className="login__intro">For {session.user.email}</p>
        </div>
        {error && <p className="login__notice login__notice--error" role="alert">{error}</p>}
        <fieldset className="login__fields" disabled={isPending}>
          <legend className="sr-only">New password</legend>
          <div className="login__field">
            <label className="login__label" htmlFor="reset-password">New password</label>
            <div className="login__password">
              <input id="reset-password" name="password" className="login__input" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" required minLength={8} aria-describedby="reset-hint" placeholder="Create a password" />
              <button type="button" className="login__eye" aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>
                <img src={eyeIcon} alt="" width="24" height="24" />
              </button>
            </div>
            <p id="reset-hint" className="login__hint">Use at least 8 characters.</p>
          </div>
          <div className="login__field">
            <label className="login__label" htmlFor="reset-confirm">Confirm new password</label>
            <input id="reset-confirm" name="confirmation" className="login__input" type={showPassword ? 'text' : 'password'}
              autoComplete="new-password" required minLength={8} placeholder="Enter it again" />
          </div>
        </fieldset>
        <button type="submit" className="login__submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </main>
  )
}

export default ResetPassword
