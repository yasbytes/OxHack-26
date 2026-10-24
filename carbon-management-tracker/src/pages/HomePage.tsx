import { useState, type FormEvent } from 'react'
import LogPanel from '../components/LogPanel.tsx'
import PetCard from '../components/PetCard.tsx'
import { addLogItem } from '../logStore.ts'
import { COINS } from '../sampleData.ts'
import { useLimits, useProfile } from '../profileStore.ts'
import { useFootprint } from '../footprint.ts'
import cloud1 from '../assets/icons/cloud-1.svg'
import cloud2 from '../assets/icons/cloud-2.svg'
import cloud4 from '../assets/icons/cloud-4.svg'

// Placeholders until auth, weather and the backend are wired up
const TEMPERATURE_C = 13

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function HomePage() {
  const [quickLog, setQuickLog] = useState('')
  const { yearTonnes, monthKg, weekKg } = useFootprint()
  const { name } = useProfile()
  const { monthlyLimitKg, weeklyBudgetKg } = useLimits()
  const month = Math.round(monthKg)
  const overLimit = month > monthlyLimitKg

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
          {greeting()}{name ? ` ${name}` : ''}!
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
            {month} kg CO₂e <span className="net-worth__period">this month</span>
          </div>
          <div className="limit">
            <div
              className={`limit__bar${overLimit ? ' limit__bar--over' : ''}`}
              role="progressbar"
              aria-label="Footprint against your limit"
              aria-valuemin={0}
              aria-valuemax={monthlyLimitKg}
              aria-valuenow={month}
            >
              <div
                className="limit__fill"
                style={{ width: `${Math.min(month / monthlyLimitKg, 1) * 100}%` }}
              />
            </div>
            <p className="limit__text">
              {overLimit
                ? `${month - monthlyLimitKg} kg over your ${monthlyLimitKg} kg monthly limit`
                : `${monthlyLimitKg - month} kg left of your ${monthlyLimitKg} kg monthly limit`}
              {` · ${yearTonnes.toFixed(1)} t so far this year`}
            </p>
          </div>
        </section>
        <PetCard weekKg={weekKg} budgetKg={weeklyBudgetKg} coins={COINS} />
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
