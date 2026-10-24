import { useState, type FormEvent } from 'react'
import LogPanel from '../components/LogPanel.tsx'
import PetCard from '../components/PetCard.tsx'
import { addLogItem } from '../logStore.ts'
import { COINS, LIMIT_TONNES, WEEKLY_BUDGET_KG } from '../sampleData.ts'
import { useFootprint } from '../footprint.ts'
import cloud1 from '../assets/icons/cloud-1.svg'
import cloud2 from '../assets/icons/cloud-2.svg'
import cloud4 from '../assets/icons/cloud-4.svg'

// Placeholders until auth, weather and the backend are wired up
const USER_NAME = 'name'
const TEMPERATURE_C = 13

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function HomePage() {
  const [quickLog, setQuickLog] = useState('')
  const { yearTonnes, weekKg } = useFootprint()
  // Two decimals so a single logged trip or meal visibly moves the number
  const shownTonnes = yearTonnes.toFixed(2)
  const overLimit = yearTonnes > LIMIT_TONNES

  function handleQuickLog(e: FormEvent) {
    e.preventDefault()
    // TODO: send to the backend for Gemini to parse once the API exists
    console.log('quick log', quickLog)
    addLogItem({
      kind: 'quick',
      date: new Date().toISOString().slice(0, 10),
      title: quickLog,
      detail: '',
      // Free text needs Gemini to read it, so there's no estimate yet
      kg: null,
    })
    setQuickLog('')
  }

  return (
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

      <div className="hero-row">
        <section className="card net-worth">
          <h2 className="card__title">Your carbon footprint</h2>
          <div className="net-worth__value">
            {shownTonnes} tons CO₂e
          </div>
          <div className="limit">
            <div
              className={`limit__bar${overLimit ? ' limit__bar--over' : ''}`}
              role="progressbar"
              aria-label="Footprint against your limit"
              aria-valuemin={0}
              aria-valuemax={LIMIT_TONNES}
              aria-valuenow={yearTonnes}
            >
              <div
                className="limit__fill"
                style={{ width: `${Math.min(yearTonnes / LIMIT_TONNES, 1) * 100}%` }}
              />
            </div>
            <p className="limit__text">
              {overLimit
                ? `${(yearTonnes - LIMIT_TONNES).toFixed(1)} t over your ${LIMIT_TONNES} t limit`
                : `${(LIMIT_TONNES - yearTonnes).toFixed(1)} t left of your ${LIMIT_TONNES} t yearly limit`}
            </p>
          </div>
        </section>
        <PetCard weekKg={weekKg} budgetKg={WEEKLY_BUDGET_KG} coins={COINS} />
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
