import { useState, type FormEvent } from 'react'
import eyeIcon from '../assets/icons/eye.svg'

type Props = {
  onLogin: () => void
}

function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // TODO: check the password with the backend once auth exists
    onLogin()
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <p className="login__brand">Future Earth</p>
        <h1 className="login__title">Login to your account</h1>

        <div className="login__fields">
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
              <button type="button" className="login__forgot">
                Forgot ?
              </button>
            </div>
            <div className="login__password">
              <input
                id="login-password"
                className="login__input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
          Login now
        </button>
      </form>

      <p className="login__signup-text">Don’t have an account?</p>
      {/* No sign-up flow yet, so this lets people straight in for the demo */}
      <button type="button" className="login__signup" onClick={onLogin}>
        Sign up
      </button>
    </div>
  )
}

export default LoginPage
