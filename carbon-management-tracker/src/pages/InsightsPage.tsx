import { useState } from 'react'
import { useLog } from '../logStore.ts'
import { CATEGORY_KG, LIMIT_TONNES, WEEKLY_BUDGET_KG } from '../sampleData.ts'
import { useFootprint } from '../footprint.ts'

type CategoryKg = { id: (typeof CATEGORY_KG)[number]['id']; label: string; kg: number }[]

const TIPS: Record<(typeof CATEGORY_KG)[number]['id'], string> = {
  travel:
    'Travel is your biggest source. Swapping one regular car trip a week for the bus, train or a bike makes the biggest dent.',
  energy:
    'Home energy is your biggest source. Turning the heating down 1°C and switching off standby are the quickest wins.',
  food: 'Food is your biggest source. Swapping beef or lamb for chicken, beans or tofu a few times a week makes a big difference.',
}

const DAY_MS = 86_400_000

function weekLabel(weeksAgo: number) {
  const d = new Date(Date.now() - weeksAgo * 7 * DAY_MS)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

// As YYYY-MM-DD, to compare with log entry dates
function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)
}

// Straight-line estimate: this year's total so far, scaled to a full year
function projectYear(yearTonnes: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear() + 1, 0, 1)
  const elapsed = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())
  return yearTonnes / elapsed
}

function WeeklyChart({ weeklyKg }: { weeklyKg: number[] }) {
  const [active, setActive] = useState<number | null>(null)
  const weeks = weeklyKg.map((kg, i) => ({
    kg,
    label: i === weeklyKg.length - 1 ? 'This week' : weekLabel(weeklyKg.length - 1 - i),
    over: kg > WEEKLY_BUDGET_KG,
  }))
  const top = Math.ceil((Math.max(...weeklyKg, WEEKLY_BUDGET_KG) * 1.1) / 50) * 50
  const ticks = Array.from({ length: top / 50 + 1 }, (_, i) => i * 50)
  const pct = (kg: number) => `${(kg / top) * 100}%`

  return (
    <>
      <div className="chart-legend">
        <span className="chart-legend__item">
          <span className="chart-legend__swatch" aria-hidden="true" />
          Under budget
        </span>
        <span className="chart-legend__item">
          <span className="chart-legend__swatch chart-legend__swatch--over" aria-hidden="true" />
          Over budget
        </span>
        <span className="chart-legend__item">
          <span className="chart-legend__line" aria-hidden="true" />
          Weekly budget ({WEEKLY_BUDGET_KG} kg)
        </span>
      </div>

      <div className="columns" onMouseLeave={() => setActive(null)}>
        <div className="columns__plot">
          {ticks.map((t) => (
            <div key={t} className="columns__grid" style={{ bottom: pct(t) }}>
              <span className="columns__tick">{t}</span>
            </div>
          ))}
          <div className="columns__budget" style={{ bottom: pct(WEEKLY_BUDGET_KG) }} />

          <div className="columns__bars">
            {weeks.map((w, i) => (
              <button
                key={w.label}
                type="button"
                className="columns__slot"
                aria-label={`${w.label}: ${w.kg} kg${w.over ? ', over budget' : ''}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <span
                  className={`columns__bar${w.over ? ' columns__bar--over' : ''}${
                    active === i ? ' columns__bar--active' : ''
                  }`}
                  style={{ height: pct(w.kg) }}
                />
                {active === i && (
                  <span className="chart-tip" style={{ bottom: `calc(${pct(w.kg)} + 8px)` }}>
                    <strong>{w.label}</strong>
                    {w.kg} kg CO₂e
                    <span className="chart-tip__sub">
                      {w.over
                        ? `${w.kg - WEEKLY_BUDGET_KG} kg over budget`
                        : `${WEEKLY_BUDGET_KG - w.kg} kg under budget`}
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="columns__labels" aria-hidden="true">
          {weeks.map((w) => (
            <span key={w.label}>{w.label}</span>
          ))}
        </div>
      </div>

      <details className="chart-table">
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Week</th>
              <th scope="col">kg CO₂e</th>
              <th scope="col">vs budget</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.label}>
                <td>{w.label}</td>
                <td>{w.kg}</td>
                <td>
                  {w.over ? '+' : '−'}
                  {Math.abs(w.kg - WEEKLY_BUDGET_KG)} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

function Breakdown({ categoryKg }: { categoryKg: CategoryKg }) {
  const total = categoryKg.reduce((sum, c) => sum + c.kg, 0)
  const max = Math.max(...categoryKg.map((c) => c.kg))

  return (
    <>
      <ul className="bars">
        {categoryKg.map((c) => (
          <li key={c.id} className="bars__row">
            <span className="bars__label">{c.label}</span>
            <div className="bars__track">
              <span className="bars__bar" style={{ width: `${(c.kg / max) * 100}%` }} />
              <span className="bars__value">
                {c.kg} kg · {Math.round((c.kg / total) * 100)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
      <details className="chart-table">
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">kg CO₂e</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {categoryKg.map((c) => (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td>{c.kg}</td>
                <td>{Math.round((c.kg / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

function InsightsPage() {
  const log = useLog()
  const weekAgo = daysAgo(7)
  const loggedThisWeek = log.filter((i) => i.date > weekAgo).length

  const { yearTonnes, weekKg, weeklyKg, categoryKg } = useFootprint()
  const week = Math.round(weekKg)
  const projected = projectYear(yearTonnes)
  const projectedOver = projected > LIMIT_TONNES
  const weekOver = week > WEEKLY_BUDGET_KG
  const biggest = categoryKg.reduce((a, b) => (b.kg > a.kg ? b : a))

  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">Insights</h1>
      </header>

      <div className="stats">
        <section className="card stat">
          <h2 className="stat__label">This week</h2>
          <p className="stat__value">{week} kg</p>
          <p className="stat__sub">
            {weekOver
              ? `${week - WEEKLY_BUDGET_KG} kg over your ${WEEKLY_BUDGET_KG} kg budget`
              : `${WEEKLY_BUDGET_KG - week} kg under your ${WEEKLY_BUDGET_KG} kg budget`}
          </p>
        </section>
        <section className="card stat">
          <h2 className="stat__label">Year so far</h2>
          <p className="stat__value">{yearTonnes.toFixed(1)} t</p>
          <p className="stat__sub">of your {LIMIT_TONNES} t yearly limit</p>
        </section>
        <section className={`card stat${projectedOver ? ' stat--warn' : ''}`}>
          <h2 className="stat__label">On track for</h2>
          <p className="stat__value">{projected.toFixed(1)} t</p>
          <p className="stat__sub">
            {projectedOver
              ? `⚠ ${(projected - LIMIT_TONNES).toFixed(1)} t over your limit at this rate`
              : `✓ ${(LIMIT_TONNES - projected).toFixed(1)} t under your limit at this rate`}
          </p>
        </section>
        <section className="card stat">
          <h2 className="stat__label">Logged this week</h2>
          <p className="stat__value">{loggedThisWeek}</p>
          <p className="stat__sub">{loggedThisWeek === 1 ? 'entry' : 'entries'} in your history</p>
        </section>
      </div>

      <section className="card chart-card">
        <h2 className="card__title">Weekly footprint</h2>
        <p className="chart-card__sub">kg CO₂e per week, last 8 weeks</p>
        <WeeklyChart weeklyKg={weeklyKg} />
      </section>

      <div className="insights__row">
        <section className="card chart-card">
          <h2 className="card__title">Where it comes from</h2>
          <p className="chart-card__sub">kg CO₂e by section, last 4 weeks</p>
          <Breakdown categoryKg={categoryKg} />
        </section>

        <section className="card chart-card insights__tip">
          <h2 className="card__title">Biggest win</h2>
          <p className="insights__tip-text">{TIPS[biggest.id]}</p>
        </section>
      </div>
    </main>
  )
}

export default InsightsPage
