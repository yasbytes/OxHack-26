import { useAuth } from '../context/AuthContext'
import LogPanel from '../components/LogPanel.tsx'
import PetCard from '../components/PetCard.tsx'
import AskAI from '../components/AskAI.tsx'
import { useLimits, useProfile } from '../profileStore.ts'
import { useFootprint } from '../footprint.ts'
import WeatherBadge from '../components/WeatherBadge.tsx'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function HomePage() {
  const { session } = useAuth()
  const user = session?.user
  const accountName = typeof user?.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim() : user?.email?.split('@')[0] || 'there'
  const { yearTonnes, monthKg, weekKg } = useFootprint()
  const { name: profileName } = useProfile()
  const name = profileName || accountName
  const { monthlyLimitKg, weeklyBudgetKg } = useLimits()
  const month = Math.round(monthKg)
  const overLimit = month > monthlyLimitKg

  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">
          {greeting()}{name ? ` ${name}` : ''}!
        </h1>
        <WeatherBadge />
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
        <PetCard weekKg={weekKg} budgetKg={weeklyBudgetKg} />
      </div>

      <AskAI />

      <LogPanel />
    </main>
  )
}

export default HomePage