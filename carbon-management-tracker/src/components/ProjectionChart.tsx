import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { ChartPoint, YearData } from '../monthly.ts'

const DAY_MS = 86_400_000
const HEIGHT = 260
const PAD = { top: 16, right: 16, bottom: 28, left: 40 }
const TIP_GAP = 110 // how far above the line the tooltip sits

type Props = { data: YearData; limitTonnes: number }
type Hover = { day: number; tonnes: number; projected: boolean }

<<<<<<< HEAD
function ProjectionChart({ data, limitTonnes }: Props) {
=======
type Props = {
  yearTonnes: number
  // Last 8 weeks, oldest first, so the recent part of the line has real shape
  weeklyKg: number[]
  limitTonnes: number
  // kg a day since logging began this year, carried on to 31 December
  paceKgPerDay: number
}

// Running total for the year: a steady pace up to 8 weeks ago, the real weekly
// totals since then, and the current pace carried on to 31 December
function buildSeries(yearTonnes: number, weeklyKg: number[], paceKgPerDay: number, today: Date) {
  const start = new Date(today.getFullYear(), 0, 1)
  const daysInYear = Math.round((new Date(today.getFullYear() + 1, 0, 1).getTime() - start.getTime()) / DAY_MS)
  const elapsed = Math.max(1, Math.round((today.getTime() - start.getTime()) / DAY_MS))
  const yearKg = yearTonnes * 1000
  const recentDays = Math.min(weeklyKg.length * 7, elapsed)
  const recentKg = weeklyKg.reduce((sum, kg) => sum + kg, 0)
  const earlierKg = Math.max(0, yearKg - recentKg)
  const earlierDays = elapsed - recentDays

  function actualAt(day: number) {
    if (day <= earlierDays) return earlierDays ? (earlierKg * day) / earlierDays : 0
    const intoRecent = day - earlierDays
    const week = Math.min(Math.floor(intoRecent / 7), weeklyKg.length - 1)
    const before = weeklyKg.slice(0, week).reduce((sum, kg) => sum + kg, 0)
    return earlierKg + before + (weeklyKg[week] * (intoRecent - week * 7)) / 7
  }

  const points: Point[] = []
  for (let day = 0; day < elapsed; day += 7) {
    points.push({ day, tonnes: actualAt(day) / 1000, projected: false })
  }
  points.push({ day: elapsed, tonnes: yearTonnes, projected: false })
  const projectedAt = (day: number) => (yearKg + paceKgPerDay * (day - elapsed)) / 1000
  for (let day = elapsed + 7; day < daysInYear; day += 7) {
    points.push({ day, tonnes: projectedAt(day), projected: true })
  }
  points.push({ day: daysInYear, tonnes: projectedAt(daysInYear), projected: true })

  return { points, start, daysInYear, elapsed }
}

function dateFor(start: Date, day: number) {
  return new Date(start.getTime() + day * DAY_MS)
}

function ProjectionChart({ yearTonnes, weeklyKg, limitTonnes, paceKgPerDay }: Props) {
>>>>>>> origin/main
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [active, setActive] = useState<Hover | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

<<<<<<< HEAD
  const { points, months, year, daysInYear, daysElapsed, daysLeft, windowDays, dailyAvgKg, soFarKg, projectedKg } = data
  const start = new Date(year, 0, 1)
  const soFarT = soFarKg / 1000
  const yearEnd = projectedKg / 1000
=======
  const [today] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const { points, start, daysInYear, elapsed } = buildSeries(yearTonnes, weeklyKg, paceKgPerDay, today)
  const yearEnd = points[points.length - 1].tonnes
>>>>>>> origin/main
  const overLimit = yearEnd > limitTonnes

  const top = Math.max(1, Math.ceil(Math.max(yearEnd, limitTonnes) * 1.1))
  const step = top > 12 ? 4 : top > 6 ? 2 : 1
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step)

  const plotW = Math.max(width - PAD.left - PAD.right, 10)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (day: number) => PAD.left + (day / daysInYear) * plotW
  const y = (t: number) => PAD.top + plotH - (t / top) * plotH
  const path = (pts: ChartPoint[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.tonnes).toFixed(1)}`).join('')

  const actual = points.filter((p) => !p.projected)
  const projected = [actual[actual.length - 1], ...points.filter((p) => p.projected)]

  const monthEvery = width < 420 ? 3 : width < 640 ? 2 : 1
  const monthLabels = months
    .map((mo, m) => ({
      m,
      label: mo.label,
      day: Math.round((new Date(year, m, 1).getTime() - start.getTime()) / DAY_MS),
    }))
    .filter((mo) => mo.m % monthEvery === 0)

  // Follow the drawn line exactly by interpolating between the monthly points
  function valueAt(day: number): Hover {
    const d = Math.min(Math.max(day, 0), daysInYear)
    let i = 1
    while (i < points.length - 1 && points[i].day < d) i++
    const a = points[i - 1]
    const b = points[i]
    const t = b.day === a.day ? 0 : (d - a.day) / (b.day - a.day)
    return { day: d, tonnes: a.tonnes + (b.tonnes - a.tonnes) * t, projected: d > daysElapsed }
  }

  function handlePointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setActive(valueAt(((e.clientX - rect.left - PAD.left) / plotW) * daysInYear))
  }

  // `day` is days elapsed, so the calendar day it falls in is ceil(day) - 1
  const dayIndex = (day: number) => Math.min(Math.max(Math.ceil(day) - 1, 0), daysInYear - 1)
  const fmtDate = (day: number) =>
    new Date(year, 0, 1 + dayIndex(day)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  const basis = windowDays < 90 ? `a ${windowDays}-day window` : 'the last 90 days'

  return (
    <>
      <div className="chart-legend">
        <span className="chart-legend__item">
          <span className="chart-legend__line chart-legend__line--actual" aria-hidden="true" />
          So far this year
        </span>
        <span className="chart-legend__item">
          <span
            className={`chart-legend__line chart-legend__line--projected${overLimit ? ' chart-legend__line--over' : ''}`}
            aria-hidden="true"
          />
          Projected at your current pace
        </span>
        <span className="chart-legend__item">
          <span className="chart-legend__line" aria-hidden="true" />
          Your limit over a year ({limitTonnes} t)
        </span>
      </div>

      <div className="line-chart" ref={wrapRef}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          style={{ cursor: 'crosshair' }}
          aria-label={`Footprint so far ${soFarT.toFixed(1)} t, projected ${yearEnd.toFixed(1)} t by year end against a ${limitTonnes} t limit`}
          onPointerMove={handlePointer}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="line-chart__grid" />
              <text x={PAD.left - 8} y={y(t) + 4} className="line-chart__tick" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {monthLabels.map((mo) => (
            <text key={mo.m} x={x(mo.day)} y={HEIGHT - 8} className="line-chart__tick" textAnchor="start">
              {mo.label}
            </text>
          ))}

          <line x1={PAD.left} x2={width - PAD.right} y1={y(limitTonnes)} y2={y(limitTonnes)} className="line-chart__limit" />

          <path d={path(projected)} className={`line-chart__projected${overLimit ? ' line-chart__projected--over' : ''}`} />
          <path d={path(actual)} className="line-chart__actual" />

          {/* A dot at each month so the monthly steps are visible */}
          {points.filter((p) => p.day > 0 && p.day !== daysElapsed).map((p) => (
            <circle key={p.day} cx={x(p.day)} cy={y(p.tonnes)} r="3" className="line-chart__dot" />
          ))}

          <circle cx={x(daysElapsed)} cy={y(soFarT)} r="5" className="line-chart__dot" />
          <circle
            cx={x(daysInYear)}
            cy={y(yearEnd)}
            r="5"
            className={`line-chart__dot line-chart__dot--end${overLimit ? ' line-chart__dot--over' : ''}`}
          />
          <text x={x(daysInYear) - 8} y={y(yearEnd) - 10} className="line-chart__label" textAnchor="end">
            {yearEnd.toFixed(1)} t
          </text>

          {active && (
            <g pointerEvents="none">
              <line x1={x(active.day)} x2={x(active.day)} y1={PAD.top} y2={PAD.top + plotH} className="line-chart__cross" />
              <circle cx={x(active.day)} cy={y(active.tonnes)} r="5" className="line-chart__dot" />
            </g>
          )}
        </svg>

        {active &&
          (() => {
            const mo = months[new Date(year, 0, 1 + dayIndex(active.day)).getMonth()]
            const above = y(active.tonnes) - TIP_GAP >= 0
            return (
              <div
                className="chart-tip line-chart__tip"
                style={{
                  left: Math.min(Math.max(x(active.day), 80), width - 80),
                  top: above ? y(active.tonnes) - TIP_GAP : y(active.tonnes) + 18,
                  pointerEvents: 'none',
                  transition: 'left 60ms linear, top 60ms linear',
                }}
              >
                <strong>{fmtDate(active.day)}</strong>
                {active.tonnes.toFixed(2)} t CO₂e running total
                <span className="chart-tip__sub">
                  {mo.label}: {Math.round(mo.kg)} kg · {active.projected ? 'Projected' : 'So far'}
                </span>
              </div>
            )
          })()}
      </div>

      {soFarKg === 0 ? (
        <p className="chart-card__sub line-chart__summary">
          Nothing logged for {year} yet. Log an activity on the Home page and your months will appear here.
        </p>
      ) : (
        <p className="chart-card__sub line-chart__summary">
          You've logged {soFarT.toFixed(2)} t so far this year. Over {basis} you averaged {Math.round(dailyAvgKg)} kg a
          day, and there are {daysLeft} days left, so we add about {((dailyAvgKg * daysLeft) / 1000).toFixed(2)} t.{' '}
          {overLimit
            ? `That's ${yearEnd.toFixed(1)} t by 31 December, ${(yearEnd - limitTonnes).toFixed(1)} t over your limit.`
            : `That's ${yearEnd.toFixed(1)} t by 31 December, ${(limitTonnes - yearEnd).toFixed(1)} t under your limit.`}{' '}
          Using recent days means an old holiday won't skew the forecast, but a big trip in the last few months will
          lift it.
        </p>
      )}

      <details className="chart-table">
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">That month (kg)</th>
              <th scope="col">Running total (t)</th>
              <th scope="col">Type</th>
            </tr>
          </thead>
          <tbody>
            {months.map((mo) => (
              <tr key={mo.label}>
                <td>{mo.label}</td>
                <td>{Math.round(mo.kg)}</td>
                <td>{(mo.runningKg / 1000).toFixed(2)}</td>
                <td>{mo.projected ? 'Projected' : 'So far'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

export default ProjectionChart