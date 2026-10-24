import { useState, type FormEvent } from 'react'
import { loadPetName, moodFor, PET_NAME_KEY } from '../pet.ts'

const MAX_NAME_LENGTH = 20

type Props = {
  weekKg: number
  budgetKg: number
  coins: number
}

function PetCard({ weekKg, budgetKg, coins }: Props) {
  const mood = moodFor(weekKg, budgetKg)
  const [name, setName] = useState(loadPetName)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const shownName = name || 'Your cat'

  function startEditing() {
    setDraft(name)
    setEditing(true)
  }

  function saveName(e: FormEvent) {
    e.preventDefault()
    const next = draft.trim()
    setName(next)
    setEditing(false)
    try {
      localStorage.setItem(PET_NAME_KEY, next)
    } catch {
      // Storage can be blocked; the name still applies for this visit
    }
  }

  return (
    <section className="card pet" aria-label={`${shownName} is ${mood.label.toLowerCase()}`}>
      <span className="pet__coins" aria-label={`${coins} coins`}>
        <span className="pet__coin" aria-hidden="true" />
        {coins}
      </span>
      <div className={`pet__art pet__art--${mood.id}`}>
        <img src={mood.image} alt="" className="pet__img" />
        {mood.id === 'thriving' && (
          <span className="pet__sparkle" aria-hidden="true">
            ✦
          </span>
        )}
      </div>

      <div className="pet__info">
        <div className="pet__top">
          {editing ? (
            <form className="pet__name-form" onSubmit={saveName}>
              <input
                className="field__input pet__name-input"
                aria-label="Pet name"
                placeholder="Name your cat"
                maxLength={MAX_NAME_LENGTH}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
              />
              <button type="submit" className="pet__name-save">
                Save
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="pet__name"
              aria-label={name ? `Rename ${name}` : 'Name your cat'}
              onClick={startEditing}
            >
              {name || 'Name your cat'}
              <span className="pet__pencil" aria-hidden="true">
                ✎
              </span>
            </button>
          )}
        </div>
        <p className="pet__mood">
          {shownName} {mood.message}
        </p>
        <p className="pet__week">
          {Math.round(weekKg)} / {budgetKg} kg CO₂e this week
        </p>
      </div>
    </section>
  )
}

export default PetCard
