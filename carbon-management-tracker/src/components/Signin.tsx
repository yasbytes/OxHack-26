import { useActionState, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import eyeIcon from '../assets/icons/eye.svg'

type FormState = { error: string | null; email: string }

function Signin() {
  const { signInUser, configured, error: sessionError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(_previousState: FormState, formData: FormData): Promise<FormState> {
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const { success, data, error } = await signInUser(email, password)
    if (!success) return { error: error ?? 'Unable to log in. Please try again.', email }
    if (data?.session) {
      const from: unknown = location.state?.from
      const destination = typeof from === 'string' && (from === '/dashboard' || from.startsWith('/dashboard/') || from.startsWith('/dashboard?'))
        ? from : '/dashboard'
      void navigate(destination, { replace: true })
    }
    return { error: null, email }
  }

  const [state, submitAction, isPending] = useActionState(handleSubmit, { error: null, email: '' })

  return (
    <main className="login">
      <form className="login__card" action={submitAction} aria-busy={isPending}>
        <p className="login__brand">Future Earth</p>
        <div>
          <h1 className="login__title">Log in to your account</h1>
          <p className="login__intro">Track your footprint. Build a greener future.</p>
        </div>
        {!configured && <p className="login__notice">Demo mode: your account is saved in this browser only.</p>}
        {(state.error || sessionError) && <p className="login__notice login__notice--error" role="alert">{state.error || sessionError}</p>}
        <fieldset className="login__fields" disabled={isPending}>
          <legend className="sr-only">Login details</legend>
          <div className="login__field">
            <label className="login__label" htmlFor="signin-email">Email</label>
            <input id="signin-email" name="email" className="login__input" type="email" autoComplete="email"
              required placeholder="Enter your email" defaultValue={state.email} />
          </div>
          <div className="login__field">
            <div className="login__label-row">
              <label className="login__label" htmlFor="signin-password">Password</label>
              <Link className="login__forgot" to="/forgot-password">Forgot password?</Link>
            </div>
            <div className="login__password">
              <input id="signin-password" name="password" className="login__input" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" required placeholder="Enter your password" />
              <button type="button" className="login__eye" aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>
                <img src={eyeIcon} alt="" width="24" height="24" />
              </button>
            </div>
          </div>
        </fieldset>
        <button type="submit" className="login__submit" disabled={isPending}>
          {isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="login__signup-text">Don’t have an account?</p>
      <Link className="login__signup" to="/signup" state={location.state}
        aria-disabled={isPending} onClick={(event) => { if (isPending) event.preventDefault() }}>Sign up</Link>
    </main>
  )
}

export default Signin

