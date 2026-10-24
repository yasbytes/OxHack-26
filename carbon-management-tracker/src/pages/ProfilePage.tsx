import { useAuth } from '../context/AuthContext'
import Signout from '../components/Signout'

function ProfilePage() {
  const { session } = useAuth()
  if (!session) return null
  const user = session.user
  const name = typeof user.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim() : user.email?.split('@')[0] || 'there'

  return (
    <main className="main">
      <header className="header"><h1 className="header__greeting">Your account</h1></header>
      <section className="card account">
        <h2 className="card__title">{name}</h2>
        <p className="account__email">{user.email}</p>
        <p>Your activity history is saved for this account in this browser.</p>
        <Signout />
      </section>
    </main>
  )
}

export default ProfilePage


import { useState, type FormEvent } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { clearLog } from '../logStore.ts'
import { PET_NAME_KEY } from '../pet.ts'
import {
  DIETS,
  UK_AVERAGE_MONTHLY_KG,
  updateProfile,
  useProfile,
  type Diet,
} from '../profileStore.ts'
import { showToast } from '../toast.ts'

const LIMIT_PRESETS = [
  { kg: 500, label: 'Our default' },
  { kg: UK_AVERAGE_MONTHLY_KG, label: 'UK average' },
]

type Props = {
  onLogout: () => void
}

function ProfilePage({ onLogout }: Props) {
  const profile = useProfile()
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [household, setHousehold] = useState(String(profile.household))
  const [diet, setDiet] = useState<Diet>(profile.diet)
  const [limit, setLimit] = useState(String(profile.monthlyLimitKg))
  const [confirmReset, setConfirmReset] = useState(false)

  const weeklyKg = Math.round((Number(limit) * 12) / 52)

  function handleSave(e: FormEvent) {
    e.preventDefault()
    updateProfile({
      name: name.trim(),
      email: email.trim(),
      household: Number(household),
      diet,
      monthlyLimitKg: Number(limit),
    })
    showToast('Profile saved')
  }

  function resetDemo() {
    clearLog()
    try {
      localStorage.removeItem(PET_NAME_KEY)
    } catch {
      // Nothing saved to remove
    }
    setConfirmReset(false)
    showToast('Demo data cleared')
  }

  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">Profile</h1>
      </header>

      <form className="profile" onSubmit={handleSave}>
        <section className="card profile__card">
          <h2 className="card__title">Your details</h2>
          <div className="profile__fields">
            <label className="field">
              <span className="field__label">Name</span>
              <input
                className="field__input"
                required
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Email</span>
              <input
                className="field__input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="card profile__card">
          <h2 className="card__title">Home &amp; diet</h2>
          <div className="profile__fields profile__fields--narrow">
            <label className="field">
              <span className="field__label">People in your home</span>
              <input
                className="field__input"
                type="number"
                min="1"
                step="1"
                required
                value={household}
                onChange={(e) => setHousehold(e.target.value)}
              />
              <span className="field__hint">Energy bills are split between this many people.</span>
            </label>
          </div>
          <div className="profile__diet">
            <span className="field__label">What do you usually eat?</span>
            <div className="profile__options" role="radiogroup" aria-label="Diet">
              {DIETS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={diet === d.id}
                  className={`mode${diet === d.id ? ' mode--selected' : ''}`}
                  onClick={() => setDiet(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <span className="field__hint">The Food &amp; Diet form starts on this choice.</span>
          </div>
        </section>

        <section className="card profile__card">
          <h2 className="card__title">Monthly limit</h2>
          <p className="profile__text">
            The footprint you're aiming to stay under. Your cat's mood is based on the weekly share
            of it.
          </p>
          <div className="profile__limit">
            <label className="field">
              <span className="field__label">kg CO₂e a month</span>
              <input
                className="field__input"
                type="number"
                min="50"
                max={UK_AVERAGE_MONTHLY_KG}
                step="10"
                required
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
              <span className="field__hint">
                About {weeklyKg} kg a week. Can't be more than the UK average (
                {UK_AVERAGE_MONTHLY_KG} kg).
              </span>
            </label>
            <div className="profile__presets">
              {LIMIT_PRESETS.map((p) => (
                <button
                  key={p.kg}
                  type="button"
                  className={`mode mode--small${Number(limit) === p.kg ? ' mode--selected' : ''}`}
                  onClick={() => setLimit(String(p.kg))}
                >
                  {p.kg} kg · {p.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="profile__actions">
          <button type="submit" className="calculate">
            save
          </button>
        </div>
      </form>

      <section className="card profile__card">
        <h2 className="card__title">Account</h2>
        <div className="profile__account">
          <button type="button" className="profile__button" onClick={onLogout}>
            Log out
          </button>
          <button
            type="button"
            className="profile__button profile__button--danger"
            onClick={() => setConfirmReset(true)}
          >
            Reset demo data
          </button>
        </div>
        <p className="field__hint profile__hint">
          Reset clears your logged history and your cat's name. Your profile stays.
        </p>
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="Reset demo data?"
          message="This deletes everything in your History and your cat's name. This can't be undone."
          confirmLabel="Reset"
          onConfirm={resetDemo}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </main>
  )
}

export default ProfilePage