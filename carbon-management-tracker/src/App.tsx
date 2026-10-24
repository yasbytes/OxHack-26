import { useState, type FormEvent } from 'react'
import './App.css'
import LogPanel from './components/LogPanel.tsx'
import userIcon from './assets/icons/user.svg'
import cloud1 from './assets/icons/cloud-1.svg'
import cloud2 from './assets/icons/cloud-2.svg'
import cloud4 from './assets/icons/cloud-4.svg'

// Placeholders until auth, weather and the backend are wired up
const USER_NAME = 'name'
const TEMPERATURE_C = 13
const NET_WORTH_TONNES = 5.6

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function App() {
  const [quickLog, setQuickLog] = useState('')

  function handleQuickLog(e: FormEvent) {
    e.preventDefault()
    // TODO: send to the backend for Gemini to parse once the API exists
    console.log('quick log', quickLog)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <img src={userIcon} alt="Profile" className="sidebar__avatar" />
      </aside>

      <main className="main">
        <header className="header">
          <h1 className="header__greeting">
            {greeting()} {USER_NAME} !
          </h1>
          <div className="weather" aria-label={`${TEMPERATURE_C} degrees, cloudy`}>
            <div className="weather__cloud" aria-hidden="true">
              <div className="weather__cloud-inner">
                <img src={cloud1} alt="" style={{ left: 0, top: 26 }} />
                <img src={cloud4} alt="" style={{ left: 32, top: 26 }} />
                <img src={cloud2} alt="" style={{ left: 23, top: 0 }} />
                <img src={cloud1} alt="" style={{ left: 45, top: 24 }} />
              </div>
            </div>
            <span className="weather__temp">{TEMPERATURE_C}°C</span>
          </div>
        </header>

        <section className="card net-worth">
          <h2 className="card__title">Your carbon net worth</h2>
          <div className="net-worth__value">
            {NET_WORTH_TONNES} tons CO₂e
          </div>
        </section>

        <form className="quick-log-row" onSubmit={handleQuickLog}>
          <section className="card quick-log">
            <label className="quick-log__label" htmlFor="quick-log">
              <span className="card__title">Quick log</span>
              <span className="quick-log__hint">what did you do today?</span>
            </label>
            <textarea
              id="quick-log"
              className="quick-log__input"
              required
              value={quickLog}
              onChange={(e) => setQuickLog(e.target.value)}
            />
          </section>
          <div className="card quick-log__submit-card">
            <button type="submit" className="quick-log__submit">
              calculate
            </button>
          </div>
        </form>

        <LogPanel />
      </main>
    </div>
  )
}

export default App

// styling - Tailwind
// data fetching - TanStack Query (React Query)
