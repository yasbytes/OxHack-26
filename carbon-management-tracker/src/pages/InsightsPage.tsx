import { useMemo } from 'react'
import { useLog } from '../logStore.ts'
import { CATEGORY_KG } from '../sampleData.ts'
import { useLimits } from '../profileStore.ts'
import { useFootprint } from '../footprint.ts'
import { buildYear } from '../monthly.ts'
import ProjectionChart from '../components/ProjectionChart.tsx'

type CategoryKg = { id: (typeof CATEGORY_KG)[number]['id']; label: string; kg: number }[]

const TIPS: Record<(typeof CATEGORY_KG)[number]['id'], string> = {
  travel:
    'Travel is your biggest source. Swapping one regular car trip a week for the bus, train or a bike makes the biggest dent.',
  energy:
    'Home energy is your biggest source. Turning the heating down 1°C and switching off standby are the quickest wins.',
  food: 'Food is your biggest source. Swapping beef or lamb for chicken, beans or tofu a few times a week makes a big difference.',
}

const DAY_MS = 86_400_000

// As YYYY-MM-DD, to compare with log entry dates
function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)
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

  const { weekKg, categoryKg } = useFootprint()
  const { limitTonnes, weeklyBudgetKg } = useLimits()
  const week = Math.round(weekKg)

  // Real monthly totals and forecast, built from logged entries only
  const year = useMemo(() => buildYear(log), [log])
  const yearTonnes = year.soFarKg / 1000
  const projected = year.projectedKg / 1000

  const projectedOver = projected > limitTonnes
  const weekOver = week > weeklyBudgetKg
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
              ? `${week - weeklyBudgetKg} kg over your ${weeklyBudgetKg} kg budget`
              : `${weeklyBudgetKg - week} kg under your ${weeklyBudgetKg} kg budget`}
          </p>
        </section>
        <section className="card stat">
          <h2 className="stat__label">Year so far</h2>
          <p className="stat__value">{yearTonnes.toFixed(1)} t</p>
          <p className="stat__sub">of {limitTonnes} t (your monthly limit × 12)</p>
        </section>
        <section className={`card stat${projectedOver ? ' stat--warn' : ''}`}>
          <h2 className="stat__label">On track for</h2>
          <p className="stat__value">{projected.toFixed(1)} t</p>
          <p className="stat__sub">
            {projectedOver
              ? `⚠ ${(projected - limitTonnes).toFixed(1)} t over your limit at this rate`
              : `✓ ${(limitTonnes - projected).toFixed(1)} t under your limit at this rate`}
          </p>
        </section>
        <section className="card stat">
          <h2 className="stat__label">Logged this week</h2>
          <p className="stat__value">{loggedThisWeek}</p>
          <p className="stat__sub">{loggedThisWeek === 1 ? 'entry' : 'entries'} in your history</p>
        </section>
      </div>

      <section className="card chart-card">
        <h2 className="card__title">Year projection</h2>
        <p className="chart-card__sub">Running total of t CO₂e this year, and where you're heading</p>
        <ProjectionChart data={year} limitTonnes={limitTonnes} />
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