import { Component, type ReactNode } from 'react'
import { useRouteError } from 'react-router-dom'

// Shown instead of a blank page when something crashes, with a way out
function ErrorScreen({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)

  function resetAndReload() {
    try {
      localStorage.clear()
    } catch {
      // Storage can be blocked; reloading still helps
    }
    window.location.assign('/')
  }

  return (
    <main className="login">
      <div className="login__card">
        <p className="login__brand">Future Earth</p>
        <h1 className="login__title">Something went wrong</h1>
        <p className="login__notice login__notice--error" role="alert">{message}</p>
        <button type="button" className="login__submit" onClick={() => window.location.reload()}>
          Reload
        </button>
        <button type="button" className="profile__button" onClick={resetAndReload}>
          Clear saved data and reload
        </button>
      </div>
    </main>
  )
}

// For crashes inside a page, which React Router catches
export function RouteErrorScreen() {
  return <ErrorScreen error={useRouteError()} />
}

// For crashes outside the router, such as in the auth provider
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  render() {
    return this.state.error ? <ErrorScreen error={this.state.error} /> : this.props.children
  }
}
