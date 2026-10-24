// Mood comes from the last 7 days against a weekly budget, so a good few days
// let the pet recover. The thresholds are fractions of the budget.
const MOODS = [
  { id: 'thriving', label: 'Thriving', max: 0.75, body: '#7cc46a', message: 'is loving life!' },
  { id: 'happy', label: 'Happy', max: 1, body: '#8fcb7a', message: 'is happy.' },
  { id: 'worried', label: 'Worried', max: 1.3, body: '#a9c58f', message: 'is getting worried…' },
  { id: 'crying', label: 'Crying', max: 1.75, body: '#b5b9a3', message: 'is crying.' },
  { id: 'sick', label: 'Sick', max: Infinity, body: '#b8b2a8', message: 'feels sick.' },
] as const
type Mood = (typeof MOODS)[number]

type Props = {
  name: string
  weekKg: number
  budgetKg: number
  coins: number
}

function moodFor(weekKg: number, budgetKg: number): Mood {
  const ratio = weekKg / budgetKg
  return MOODS.find((m) => ratio < m.max) ?? MOODS[MOODS.length - 1]
}

// Placeholder art until the pet is drawn in Figma
function PetArt({ mood }: { mood: Mood }) {
  const sad = mood.id === 'worried' || mood.id === 'crying' || mood.id === 'sick'
  return (
    <svg className={`pet__art pet__art--${mood.id}`} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M60 30c-6-14-20-18-26-14 4 10 14 16 26 14z"
        fill={mood.id === 'sick' ? '#9e9a7c' : '#5d994f'}
      />
      <ellipse cx="60" cy="72" rx="40" ry="36" fill={mood.body} />
      <ellipse cx="60" cy="84" rx="24" ry="16" fill="#fff" opacity="0.35" />

      {mood.id === 'sick' ? (
        <>
          <path d="M40 62l8 8M48 62l-8 8M72 62l8 8M80 62l-8 8" stroke="#4a3a3a" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="45" cy="66" r="5" fill="#4a3a3a" />
          <circle cx="75" cy="66" r="5" fill="#4a3a3a" />
          <circle cx="47" cy="64" r="1.6" fill="#fff" />
          <circle cx="77" cy="64" r="1.6" fill="#fff" />
        </>
      )}

      {mood.id === 'worried' && (
        <path d="M37 56l12-4M83 56l-12-4" stroke="#4a3a3a" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {sad ? (
        <path d="M50 88q10-8 20 0" fill="none" stroke="#4a3a3a" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M48 80q12 12 24 0" fill="none" stroke="#4a3a3a" strokeWidth="3" strokeLinecap="round" />
      )}

      {!sad && (
        <>
          <ellipse cx="36" cy="78" rx="6" ry="3.5" fill="#f2a1a1" opacity="0.7" />
          <ellipse cx="84" cy="78" rx="6" ry="3.5" fill="#f2a1a1" opacity="0.7" />
        </>
      )}

      {mood.id === 'crying' && (
        <>
          <path className="pet__tear" d="M44 73q-3 6 0 9q3-3 0-9z" fill="#7fc4e8" />
          <path className="pet__tear pet__tear--late" d="M76 73q-3 6 0 9q3-3 0-9z" fill="#7fc4e8" />
        </>
      )}

      {mood.id === 'thriving' && (
        <path d="M100 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f5d76e" />
      )}
    </svg>
  )
}

function PetCard({ name, weekKg, budgetKg, coins }: Props) {
  const mood = moodFor(weekKg, budgetKg)

  return (
    <section className="card pet" aria-label={`${name} is ${mood.label.toLowerCase()}`}>
      <PetArt mood={mood} />
      <div className="pet__info">
        <div className="pet__top">
          <h2 className="pet__name">{name}</h2>
          <span className="pet__coins" aria-label={`${coins} coins`}>
            <span className="pet__coin" aria-hidden="true" />
            {coins}
          </span>
        </div>
        <p className="pet__mood">
          {name} {mood.message}
        </p>
        <p className="pet__week">
          {Math.round(weekKg)} / {budgetKg} kg CO₂e this week
        </p>
      </div>
    </section>
  )
}

export default PetCard
