import { useState, type FormEvent } from 'react'
import eyeIcon from '../assets/icons/eye.svg'
import { nameFromEmail, updateProfile, useProfile } from '../profileStore.ts'

type Props = {
  onLogin: () => void
}

function LoginPage({ onLogin }: Props) {
  const profile = useProfile()
  const [signingUp, setSigningUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // TODO: check the password (or create the account) with the backend once auth exists
    if (signingUp) {
      updateProfile({ name: name.trim(), email })
    } else {
      // Keep a name registered earlier on this device, otherwise guess one from the email
      updateProfile({ email, name: profile.name || nameFromEmail(email) })
    }
    onLogin()
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <p className="login__brand">Future Earth</p>
        <h1 className="login__title">
          {signingUp ? 'Create your account' : 'Login to your account'}
        </h1>

        <div className="login__fields">
          {signingUp && (
            <div className="login__field">
              <label className="login__label" htmlFor="login-name">
                Name
              </label>
              <input
                id="login-name"
                className="login__input"
                autoComplete="given-name"
                required
                placeholder="What should we call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="login__field">
            <label className="login__label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="login__input"
              type="email"
              autoComplete="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="login__field">
            <div className="login__label-row">
              <label className="login__label" htmlFor="login-password">
                Password
              </label>
              {/* TODO: password reset needs the backend */}
              {!signingUp && (
                <button type="button" className="login__forgot">
                  Forgot ?
                </button>
              )}
            </div>
            <div className="login__password">
              <input
                id="login-password"
                className="login__input"
                type={showPassword ? 'text' : 'password'}
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login__eye"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((s) => !s)}
              >
                <img src={eyeIcon} alt="" width="24" height="24" />
              </button>
            </div>
          </div>
        </div>

        <button type="submit" className="login__submit">
          {signingUp ? 'Create account' : 'Login now'}
        </button>
      </form>

      <p className="login__signup-text">
        {signingUp ? 'Already have an account?' : 'Don’t have an account?'}
      </p>
      <button type="button" className="login__signup" onClick={() => setSigningUp((s) => !s)}>
        {signingUp ? 'Log in' : 'Sign up'}
      </button>
    </div>
  )
}

export default LoginPage
