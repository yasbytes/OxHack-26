import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import LogPanel from '../components/LogPanel.tsx'
import PetCard from '../components/PetCard.tsx'
import { addLogItem } from '../logStore.ts'
import {
  COINS,
  LIMIT_TONNES,
  WEEK_KG,
  WEEKLY_BUDGET_KG,
  YEAR_TONNES as NET_WORTH_TONNES,
} from '../sampleData.ts'
import cloud1 from '../assets/icons/cloud-1.svg'
import cloud2 from '../assets/icons/cloud-2.svg'
import cloud4 from '../assets/icons/cloud-4.svg'

// Weather and emissions are placeholders until the backend is wired up.
const TEMPERATURE_C = 13
const PET_NAME = 'Sprout'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function HomePage() {
  const { session } = useAuth()
  const user = session?.user
  const name = typeof user?.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim() : user?.email?.split('@')[0] || 'there'
  const [quickLog, setQuickLog] = useState('')
  const overLimit = NET_WORTH_TONNES > LIMIT_TONNES

  function handleQuickLog(e: FormEvent) {
    e.preventDefault()
    // TODO: send to the backend for Gemini to parse once the API exists
    console.log('quick log', quickLog)
    addLogItem({
      kind: 'quick',
      date: new Date().toISOString().slice(0, 10),
      title: quickLog,
      detail: '',
    })
    setQuickLog('')
  }

  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">
          {greeting()}, {name}!
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

      <div className="hero-row">
        <section className="card net-worth">
          <h2 className="card__title">Your carbon footprint</h2>
          <div className="net-worth__value">
            {NET_WORTH_TONNES} tons CO₂e
          </div>
          <div className="limit">
            <div
              className={`limit__bar${overLimit ? ' limit__bar--over' : ''}`}
              role="progressbar"
              aria-label="Footprint against your limit"
              aria-valuemin={0}
              aria-valuemax={LIMIT_TONNES}
              aria-valuenow={NET_WORTH_TONNES}
            >
              <div
                className="limit__fill"
                style={{ width: `${Math.min(NET_WORTH_TONNES / LIMIT_TONNES, 1) * 100}%` }}
              />
            </div>
            <p className="limit__text">
              {overLimit
                ? `${(NET_WORTH_TONNES - LIMIT_TONNES).toFixed(1)} t over your ${LIMIT_TONNES} t limit`
                : `${(LIMIT_TONNES - NET_WORTH_TONNES).toFixed(1)} t left of your ${LIMIT_TONNES} t yearly limit`}
            </p>
          </div>
        </section>
        <PetCard name={PET_NAME} weekKg={WEEK_KG} budgetKg={WEEKLY_BUDGET_KG} coins={COINS} />
      </div>

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
            calculate journey
          </button>
        </div>
      </form>

      <LogPanel />
    </main>
  )
}

export default HomePage

// styling - Tailwind
// data fetching - TanStack Query (React Query)
