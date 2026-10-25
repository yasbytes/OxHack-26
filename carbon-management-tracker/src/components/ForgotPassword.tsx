import { useActionState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type FormState = { error: string | null; sent: boolean; email: string }

function ForgotPassword() {
  const { sendPasswordReset, configured } = useAuth()

  async function handleSubmit(_previousState: FormState, formData: FormData): Promise<FormState> {
    const email = String(formData.get('email') ?? '').trim()
    const { success, error } = await sendPasswordReset(email)
    if (!success) return { error: error ?? 'Unable to send the reset email. Please try again.', sent: false, email }
    return { error: null, sent: true, email }
  }

  const [state, submitAction, isPending] = useActionState(handleSubmit, { error: null, sent: false, email: '' })

  return (
    <main className="login">
      <form className="login__card" action={submitAction} aria-busy={isPending}>
        <p className="login__brand">Future Earth</p>
        <div>
          <h1 className="login__title">Reset your password</h1>
          <p className="login__intro">Enter your email and we'll send you a link to choose a new password.</p>
        </div>
        {!configured && <p className="login__notice">Demo mode: passwords aren't checked, so log in with any password.</p>}
        {state.error && <p className="login__notice login__notice--error" role="alert">{state.error}</p>}
        {state.sent && (
          <p className="login__notice" role="status">
            If {state.email} has an account, a reset link is on its way. Check your inbox and spam folder.
          </p>
        )}
        <fieldset className="login__fields" disabled={isPending || !configured}>
          <legend className="sr-only">Reset details</legend>
          <div className="login__field">
            <label className="login__label" htmlFor="forgot-email">Email</label>
            <input id="forgot-email" name="email" className="login__input" type="email" autoComplete="email"
              required placeholder="Enter your email" defaultValue={state.email} />
          </div>
        </fieldset>
        <button type="submit" className="login__submit" disabled={isPending || !configured}>
          {isPending ? 'Sending…' : state.sent ? 'Send again' : 'Send reset link'}
        </button>
      </form>
      <p className="login__signup-text">Remembered it?</p>
      <Link className="login__signup" to="/">Log in</Link>
    </main>
  )
}

export default ForgotPassword
