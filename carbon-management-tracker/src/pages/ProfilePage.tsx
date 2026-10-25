import { useState, type FormEvent } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import Signout from '../components/Signout.tsx'
import { useAuth } from '../context/AuthContext'
import { clearLog } from '../logStore.ts'
import {
  DIETS,
  nameFromEmail,
  MAX_MONTHLY_LIMIT_KG,
  MIN_MONTHLY_LIMIT_KG,
  UK_AVERAGE_MONTHLY_KG,
  saveUsername,
  updateProfile,
  USERNAME_PATTERN,
  useProfile,
  type Diet,
} from '../profileStore.ts'
import { resetShop } from '../shopStore.ts'
import { showToast } from '../toast.ts'

const LIMIT_PRESETS = [
  { kg: MAX_MONTHLY_LIMIT_KG, label: '20% below average' },
  { kg: Math.round(UK_AVERAGE_MONTHLY_KG / 2), label: 'Half the average' },
]

function ProfilePage() {
  const { session } = useAuth()
  // The account email is the login, so it's shown here but changed through auth, not this form
  const email = session?.user.email ?? ''
  const accountName = session?.user.user_metadata.full_name
  const profile = useProfile()
  const [name, setName] = useState(
    profile.name || (typeof accountName === 'string' ? accountName.trim() : '') || nameFromEmail(email),
  )
  // Follows the saved username (which can arrive from the account after this
  // page opens) until the user types
  const [typedUsername, setUsername] = useState<string | null>(null)
  const username = typedUsername ?? profile.username
  const [usernameError, setUsernameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [household, setHousehold] = useState(String(profile.household))
  const [diet, setDiet] = useState<Diet>(profile.diet)
  const [limit, setLimit] = useState(String(profile.monthlyLimitKg))
  const [confirmReset, setConfirmReset] = useState(false)

  const weeklyKg = Math.round((Number(limit) * 12) / 52)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (username.trim()) {
      setSaving(true)
      const failure = await saveUsername(username)
      setSaving(false)
      setUsernameError(failure ?? '')
      if (failure) return
    }
    updateProfile({
      name: name.trim(),
      email,
      household: Number(household),
      diet,
      monthlyLimitKg: Number(limit),
    })
    showToast('Profile saved')
  }

  function resetData() {
    clearLog()
    resetShop()
    updateProfile({ petName: '' })
    setConfirmReset(false)
    showToast('Your data was cleared')
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
              <span className="field__label">Username</span>
              <input
                className="field__input"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. alex_k"
                pattern={`@?${USERNAME_PATTERN}`}
                title="3 to 20 lowercase letters, numbers or _"
                value={username}
                aria-invalid={!!usernameError}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase())
                  setUsernameError('')
                }}
              />
              {usernameError ? (
                <span className="friends__error" role="alert">
                  {usernameError}
                </span>
              ) : (
                <span className="field__hint">Friends add you with this.</span>
              )}
            </label>
            <label className="field">
              <span className="field__label">Email</span>
              <input
                className="field__input"
                type="email"
                readOnly
                value={email}
              />
              <span className="field__hint">The email you log in with.</span>
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
                max="20"
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
                min={MIN_MONTHLY_LIMIT_KG}
                max={MAX_MONTHLY_LIMIT_KG}
                step="1"
                required
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
              <span className="field__hint">
                About {weeklyKg} kg a week. The UK average for travel, home and food is{' '}
                {UK_AVERAGE_MONTHLY_KG} kg, so the most you can set is {MAX_MONTHLY_LIMIT_KG} kg (20%
                below).
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
          <button type="submit" className="calculate" disabled={saving}>
            {saving ? 'saving…' : 'save'}
          </button>
        </div>
      </form>

      <section className="card profile__card">
        <h2 className="card__title">Account</h2>
        <div className="profile__account">
          <Signout className="profile__button" />
          <button
            type="button"
            className="profile__button profile__button--danger"
            onClick={() => setConfirmReset(true)}
          >
            Reset my data
          </button>
        </div>
        <p className="field__hint profile__hint">
          Reset clears your logged history, coins, food and your cat's name. Your profile stays.
        </p>
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="Reset your data?"
          message="This deletes everything in your History, your coins and food, and your cat's name. This can't be undone."
          confirmLabel="Reset"
          onConfirm={resetData}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </main>
  )
}

export default ProfilePage
