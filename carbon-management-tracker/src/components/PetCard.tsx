import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { fedMood, moodFor, type Mood } from '../pet.ts'
import { updateProfile, useProfile } from '../profileStore.ts'
import { feedItem, SHOP_ITEMS, useFed, useShop } from '../shopStore.ts'
import { useLastAdded } from '../logStore.ts'
import { reactionFor } from '../petReactions.ts'

const MAX_NAME_LENGTH = 20

type Props = {
  weekKg: number
  budgetKg: number
}

function PetCard({ weekKg, budgetKg }: Props) {
  const { coins, owned } = useShop()
  const { fed, hoursLeft } = useFed()
  const collapsed = moodFor(weekKg, budgetKg).id === 'sick'
  const mood = fedMood(moodFor(weekKg, budgetKg), fed)
  const hours = `${hoursLeft} more ${hoursLeft === 1 ? 'hour' : 'hours'}`
  const food = SHOP_ITEMS.filter((item) => owned[item.id] > 0)
  const { petName: name } = useProfile()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const shownName = name || 'Your cat'
  // The line the cat is saying right now, shown in a speech bubble while it plays
  const [speech, setSpeech] = useState<string | null>(null)
  const voice = useRef<HTMLAudioElement | null>(null)
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speechVersion = useRef(0)
  const lastAdded = useLastAdded()
  const line = lastAdded ? reactionFor(lastAdded) : { says: mood.says, voice: mood.voice }

  // Stop talking when the card goes away
  useEffect(() => () => {
    speechVersion.current++
    voice.current?.pause()
    if (speechTimer.current) clearTimeout(speechTimer.current)
  }, [])

  function speak() {
    if (!line.says) return
    voice.current?.pause()
    if (speechTimer.current) clearTimeout(speechTimer.current)
    const version = ++speechVersion.current
    setSpeech(line.says)
    const done = () => { if (speechVersion.current === version) setSpeech(null) }
    const keepText = () => {
      if (speechVersion.current !== version) return
      if (speechTimer.current) clearTimeout(speechTimer.current)
      speechTimer.current = setTimeout(done, 6000)
    }
    if (!line.voice) {
      keepText()
      return
    }
    const audio = new Audio(line.voice)
    voice.current = audio
    audio.addEventListener('ended', done)
    audio.addEventListener('error', keepText)
    // If autoplay is blocked, keep the caption; clicking the cat replays it.
    audio.play().catch(keepText)
  }

  // Each new log gets a reaction to that activity, independently of the weekly mood.
  // Whatever was logged before this card appeared has already been heard.
  const lastAddedId = lastAdded?.id ?? null
  const heardId = useRef(lastAddedId)
  const speakAboutLog = useEffectEvent(speak)
  useEffect(() => {
    if (!lastAddedId || lastAddedId === heardId.current) return
    heardId.current = lastAddedId
    speakAboutLog()
  }, [lastAddedId])

  function startEditing() {
    setDraft(name)
    setEditing(true)
  }

  function saveName(e: FormEvent) {
    e.preventDefault()
    const next = draft.trim()
    setEditing(false)
    updateProfile({ petName: next })
  }

  return (
    <section className="card pet" aria-label={`${shownName} is ${mood.label.toLowerCase()}`}>
      <Link to="/dashboard/shop" className="pet__coins" aria-label={`${coins} coins, open the shop`}>
        <span className="pet__coin" aria-hidden="true" />
        {coins}
      </Link>
      {speech && (
        <p className="pet__speech" role="status">
          {speech}
        </p>
      )}
      {line.says ? (
        <button
          type="button"
          className={`pet__art pet__art--${mood.id} pet__art--talks`}
          aria-label={`Hear ${shownName}`}
          onClick={speak}
        >
          <PetArt mood={mood} />
        </button>
      ) : (
        <div className={`pet__art pet__art--${mood.id}`}>
          <PetArt mood={mood} />
        </div>
      )}

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
        {collapsed ? (
          <p className="pet__fed">
            {fed ? `Healing for ${hours}. Feed them again to keep them going.` : 'Feed them to heal them.'}
          </p>
        ) : (
          fed && <p className="pet__fed">Well fed · happier for {hours}</p>
        )}
        {food.length > 0 && (
          <div className="pet__feed">
            {food.map((item) => (
              <button
                key={item.id}
                type="button"
                className="pet__feed-button"
                onClick={() => feedItem(item, name)}
              >
                <img src={item.image} alt="" className="pet__feed-img" />
                Feed {item.name.toLowerCase()} ({owned[item.id]})
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function PetArt({ mood }: { mood: Mood }) {
  return (
    <>
      <img src={mood.image} alt="" className="pet__img" />
      {mood.id === 'thriving' && (
        <span className="pet__sparkle" aria-hidden="true">
          ✦
        </span>
      )}
    </>
  )
}

export default PetCard
