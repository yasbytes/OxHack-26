import { useState, type FormEvent } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { useFootprint } from '../footprint.ts'
import { addFriend, removeFriend, useFriends, type Friend } from '../friendsStore.ts'
import { moodFor } from '../pet.ts'
import { useLimits, useProfile } from '../profileStore.ts'

type Row = {
  id: string
  name: string
  isYou: boolean
  weekKg: number
  budgetKg: number
  yearTonnes: number
  limitTonnes: number
}

function FriendsPage() {
  const friends = useFriends()
  const profile = useProfile()
  const { weekKg, yearTonnes } = useFootprint()
  const { limitTonnes, weeklyBudgetKg } = useLimits()

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [toRemove, setToRemove] = useState<Friend | null>(null)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    // TODO: send a friend request through the backend once accounts exist
    if (addFriend(name.trim())) {
      setName('')
      setError('')
    } else {
      setError(`${name.trim()} is already your friend.`)
    }
  }

  // Ranked by how this week compares with each person's own budget, so people
  // with different limits are compared fairly; lowest first
  const rows: Row[] = [
    {
      id: 'you',
      name: profile.name ? `${profile.name} (you)` : 'You',
      isYou: true,
      weekKg: Math.round(weekKg),
      budgetKg: weeklyBudgetKg,
      yearTonnes,
      limitTonnes,
    },
    ...friends.map((f) => ({
      id: f.id,
      name: f.name,
      isYou: false,
      weekKg: f.weekKg,
      budgetKg: Math.round((f.limitTonnes * 1000) / 52),
      yearTonnes: f.yearTonnes,
      limitTonnes: f.limitTonnes,
    })),
  ].sort((a, b) => a.weekKg / a.budgetKg - b.weekKg / b.budgetKg)

  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">Friends</h1>
      </header>

      <section className="card friends__card">
        <h2 className="card__title">Add a friend</h2>
        <form className="friends__form" onSubmit={handleAdd}>
          <label className="field">
            <span className="field__label">Friend's name</span>
            <input
              className="field__input"
              required
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
            />
          </label>
          <button type="submit" className="calculate">
            add friend
          </button>
        </form>
        {error && (
          <p className="friends__error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="card friends__card">
        <h2 className="card__title">This week's leaderboard</h2>
        <p className="chart-card__sub">Lowest footprint against their own budget first</p>

        <ol className="friends__list">
          {rows.map((r, i) => {
            const mood = moodFor(r.weekKg, r.budgetKg)
            const share = r.weekKg / r.budgetKg
            return (
              <li key={r.id} className={`friends__row${r.isYou ? ' friends__row--you' : ''}`}>
                <span className="friends__rank">{i + 1}</span>
                <img
                  src={mood.image}
                  alt=""
                  className={`friends__pet friends__pet--${mood.id}`}
                />
                <div className="friends__info">
                  <span className="friends__name">{r.name}</span>
                  <span className="friends__mood">
                    {r.isYou ? 'Your' : `${r.name}'s`} cat {mood.message}
                  </span>
                  <div
                    className={`friends__bar${share > 1 ? ' friends__bar--over' : ''}`}
                    role="progressbar"
                    aria-label={`${r.name} this week`}
                    aria-valuemin={0}
                    aria-valuemax={r.budgetKg}
                    aria-valuenow={r.weekKg}
                  >
                    <span style={{ width: `${Math.min(share, 1) * 100}%` }} />
                  </div>
                </div>
                <div className="friends__numbers">
                  <span className="friends__week">
                    {r.weekKg} <span className="friends__unit">/ {r.budgetKg} kg</span>
                  </span>
                  <span className="friends__year">
                    {r.yearTonnes.toFixed(1)} t this year
                  </span>
                </div>
                {r.isYou ? (
                  <span className="friends__remove-spacer" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    className="history__link history__link--delete"
                    aria-label={`Remove ${r.name}`}
                    onClick={() => setToRemove(friends.find((f) => f.id === r.id) ?? null)}
                  >
                    Remove
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        {friends.length === 0 && (
          <p className="friends__empty">Add a friend above to compare footprints.</p>
        )}
      </section>

      {toRemove && (
        <ConfirmDialog
          title={`Remove ${toRemove.name}?`}
          message="They'll disappear from your leaderboard. You can add them again later."
          confirmLabel="Remove"
          onConfirm={() => {
            removeFriend(toRemove.id)
            setToRemove(null)
          }}
          onCancel={() => setToRemove(null)}
        />
      )}
    </main>
  )
}

export default FriendsPage
