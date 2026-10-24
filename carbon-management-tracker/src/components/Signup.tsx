import { useActionState, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import eyeIcon from '../assets/icons/eye.svg'

type FormState = { error: string | null; message: string | null; email: string; name: string }

function Signup() {
  const { signUpUser, configured, error: sessionError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(_previousState: FormState, formData: FormData): Promise<FormState> {
    const email = String(formData.get('email') ?? '').trim()
    const name = String(formData.get('name') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const confirmation = String(formData.get('confirmation') ?? '')
    const values = { email, name, message: null }
    if (!name) return { ...values, error: 'Please enter your name.' }
    if (password.length < 8) return { ...values, error: 'Use at least 8 characters for your password.' }
    if (password !== confirmation) return { ...values, error: 'Your passwords do not match.' }

    const { success, data, error } = await signUpUser(email, password, name)
    if (!success) return { ...values, error: error ?? 'Unable to create your account. Please try again.' }
    if (data?.session) {
      void navigate('/dashboard', { replace: true })
      return { ...values, error: null }
    }
    return { ...values, error: null, message: 'Check your email for a confirmation link before logging in. If you already have an account, use Log in below.' }
  }

  const [state, submitAction, isPending] = useActionState(handleSubmit, { error: null, message: null, email: '', name: '' })

  return (
    <main className="login">
      <form className="login__card" action={submitAction} aria-busy={isPending}>
        <p className="login__brand">Future Earth</p>
        <div>
          <h1 className="login__title">Create your account</h1>
          <p className="login__intro">Track your footprint. Build a greener future.</p>
        </div>
        {!configured && <p className="login__notice login__notice--error" role="alert">Account access is not available yet. Please try again later.</p>}
        {(state.error || sessionError) && <p className="login__notice login__notice--error" role="alert">{state.error || sessionError}</p>}
        {state.message && <p className="login__notice" role="status">{state.message}</p>}
        <fieldset className="login__fields" disabled={isPending}>
          <legend className="sr-only">Sign-up details</legend>
          <div className="login__field">
            <label className="login__label" htmlFor="signup-name">Name</label>
            <input id="signup-name" name="name" className="login__input" autoComplete="name" required maxLength={100}
              placeholder="Your name" defaultValue={state.name} />
          </div>
          <div className="login__field">
            <label className="login__label" htmlFor="signup-email">Email</label>
            <input id="signup-email" name="email" className="login__input" type="email" autoComplete="email" required
              placeholder="Enter your email" defaultValue={state.email} />
          </div>
          <div className="login__field">
            <label className="login__label" htmlFor="signup-password">Password</label>
            <div className="login__password">
              <input id="signup-password" name="password" className="login__input" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" required minLength={8} aria-describedby="password-hint" placeholder="Create a password" />
              <button type="button" className="login__eye" aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>
                <img src={eyeIcon} alt="" width="24" height="24" />
              </button>
            </div>
            <p id="password-hint" className="login__hint">Use at least 8 characters.</p>
          </div>
          <div className="login__field">
            <label className="login__label" htmlFor="signup-confirm">Confirm password</label>
            <input id="signup-confirm" name="confirmation" className="login__input" type={showPassword ? 'text' : 'password'}
              autoComplete="new-password" required minLength={8} placeholder="Enter your password again" />
          </div>
        </fieldset>
        <button type="submit" className="login__submit" disabled={isPending || !configured}>
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="login__signup-text">Already have an account?</p>
      <Link className="login__signup" to="/" state={location.state}
        aria-disabled={isPending} onClick={(event) => { if (isPending) event.preventDefault() }}>Log in</Link>
    </main>
  )
}

export default Signup

