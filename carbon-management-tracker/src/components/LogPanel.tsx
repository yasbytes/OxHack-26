import { useRef, useState, type FormEvent } from 'react'
import carIcon from '../assets/icons/car.svg'
import busIcon from '../assets/icons/bus.svg'
import trainIcon from '../assets/icons/train.svg'
import planeIcon from '../assets/icons/plane.svg'
import walkIcon from '../assets/icons/walk.svg'
import bikeIcon from '../assets/icons/bike.svg'
import HomeEnergyForm from './HomeEnergyForm.tsx'
import FoodForm from './FoodForm.tsx'
import { addLogItem, clearLastAdded } from '../logStore.ts'
import LogResult from './LogResult.tsx'
import { travelKg } from '../estimates.ts'
import { findRoute, RouteError, type RouteResult } from '../route.ts'
import { localDate } from '../dates.ts'

const KM_PER_MILE = 1.609344

// A distance in the chosen unit, to one decimal place
function inUnit(km: number, unit: 'km' | 'mi') {
  return String(Math.round((unit === 'mi' ? km / KM_PER_MILE : km) * 10) / 10)
}

const TABS = ['Travel & Transport', 'Home & Energy', 'Food & Diet'] as const
type Tab = (typeof TABS)[number]

const MODES = [
  { id: 'car', label: 'Car / Motorbike', icon: carIcon },
  { id: 'bus', label: 'Bus / Coach', icon: busIcon },
  { id: 'train', label: 'Train', icon: trainIcon },
  { id: 'flight', label: 'Flight', icon: planeIcon },
  { id: 'walk', label: 'Walk', icon: walkIcon },
  { id: 'bicycle', label: 'Bicycle', icon: bikeIcon },
] as const
type Mode = (typeof MODES)[number]['id']

const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric']

export type TravelEntry = {
  mode: Mode
  fuelType: string | null
  // Every mode logs a distance; the start and destination can look it up
  distance: number
  unit: 'km' | 'mi'
  origin: string | null
  destination: string | null
  date: string
  description: string
}

function LogPanel() {
  const [tab, setTab] = useState<Tab>('Travel & Transport')
  const [mode, setMode] = useState<Mode>('car')
  const [fuelType, setFuelType] = useState('Electric')
  const [distance, setDistance] = useState('')
  const [unit, setUnit] = useState<'km' | 'mi'>('km')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState(() => localDate())
  const [description, setDescription] = useState('')
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routeStatus, setRouteStatus] = useState<'idle' | 'finding' | 'error'>('idle')
  const [routeError, setRouteError] = useState('')
  // The lookup in progress, so calculate can wait for it instead of starting another
  const pendingRoute = useRef<Promise<RouteResult | null> | null>(null)

  const isCar = mode === 'car'
  const isFlight = mode === 'flight'
  const hasPlaces = origin.trim() !== '' && destination.trim() !== ''
  const canFind = hasPlaces && routeStatus !== 'finding'

  // A found distance no longer applies once the trip changes; a typed one stays
  function changeTrip(update: () => void) {
    update()
    if (route) setDistance('')
    setRoute(null)
    setRouteStatus('idle')
  }

  function findDistance() {
    pendingRoute.current ??= lookUpDistance().finally(() => (pendingRoute.current = null))
    return pendingRoute.current
  }

  async function lookUpDistance() {
    setRouteStatus('finding')
    try {
      const found = await findRoute(mode, origin, destination)
      setDistance(inUnit(found.km, unit))
      setRoute(found)
      setRouteStatus('idle')
      return found
    } catch (error) {
      setRouteError(
        error instanceof RouteError ? error.message : "Couldn't reach the map service. Type the distance instead.",
      )
      setRouteStatus('error')
      return null
    }
  }

  // Look the distance up as soon as both places are in, unless one was typed
  function findIfReady() {
    if (canFind && !route && distance === '') void findDistance()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    let found = route
    let km = distance
    // Both places but no distance yet: look it up (or finish the lookup leaving the
    // To box started) and save in the same click, rather than make people press Find
    if (pendingRoute.current || (distance === '' && hasPlaces)) {
      found = await findDistance()
      if (!found) return
      km = inUnit(found.km, unit)
    }
    const entry: TravelEntry = {
      mode,
      fuelType: isCar ? fuelType : null,
      distance: Number(km),
      unit,
      origin: origin || null,
      destination: destination || null,
      date,
      description,
    }
    console.log('calculate', entry)
    const modeLabel = MODES.find((m) => m.id === mode)?.label ?? mode
    const places = found ? `${found.from} → ${found.to}` : origin || destination ? `${origin || '?'} → ${destination || '?'}` : ''
    const trip = [places, `${km} ${unit}`].filter(Boolean).join(' · ')
    addLogItem({
      kind: 'travel',
      date,
      title: isCar ? `${modeLabel} (${fuelType})` : modeLabel,
      detail: [trip, description].filter(Boolean).join(' · '),
      kg: travelKg(entry),
    })
  }

  return (
    <section className="card log-panel">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`tabs__tab${tab === t ? ' tabs__tab--active' : ''}`}
            onClick={() => {
              setTab(t)
              clearLastAdded()
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Travel & Transport' ? (
        <form className="travel" onSubmit={handleSubmit}>
          <div className="modes" role="radiogroup" aria-label="Transport mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                className={`mode${mode === m.id ? ' mode--selected' : ''}`}
                onClick={() => changeTrip(() => setMode(m.id))}
              >
                <img src={m.icon} alt="" className="mode__icon" />
                {m.label}
              </button>
            ))}
          </div>

          <div className={`travel__fields travel__fields--route${isCar ? ' travel__fields--car' : ''}`}>
            <label className="field field--origin">
              <span className="field__label">{isFlight ? 'From airport' : 'From'}</span>
              <input
                className="field__input"
                placeholder={isFlight ? 'e.g. Heathrow' : 'e.g. Oxford station'}
                value={origin}
                onChange={(e) => changeTrip(() => setOrigin(e.target.value))}
                onBlur={findIfReady}
              />
            </label>
            <label className="field field--destination">
              <span className="field__label">{isFlight ? 'To airport' : 'To'}</span>
              <input
                className="field__input"
                placeholder={isFlight ? 'e.g. Amsterdam' : 'e.g. London Paddington'}
                value={destination}
                onChange={(e) => changeTrip(() => setDestination(e.target.value))}
                onBlur={findIfReady}
              />
            </label>

            {isCar && (
              <label className="field field--fuel">
                <span className="field__label">Fuel type</span>
                <select
                  className="field__input"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="field field--distance">
              <label className="field__label" htmlFor="distance">
                Or distance
              </label>
              <div className="field__row">
                <input
                  id="distance"
                  className="field__input field__input--distance"
                  type="number"
                  min="0"
                  step="any"
                  required={!hasPlaces}
                  placeholder={hasPlaces ? 'Found from the route' : 'e.g. 12'}
                  value={distance}
                  onChange={(e) => {
                    setDistance(e.target.value)
                    setRoute(null)
                    setRouteStatus('idle')
                  }}
                />
                <select
                  className="field__input field__input--unit"
                  aria-label="Distance unit"
                  value={unit}
                  onChange={(e) => {
                    const next = e.target.value as 'km' | 'mi'
                    // Keep a found distance right when switching units
                    if (route) setDistance(inUnit(route.km, next))
                    setUnit(next)
                  }}
                >
                  <option value="km">km</option>
                  <option value="mi">mi</option>
                </select>
                <button
                  type="button"
                  className="distance__find"
                  disabled={!canFind}
                  title={canFind ? undefined : 'Fill in From and To first'}
                  onClick={findDistance}
                >
                  {routeStatus === 'finding' ? 'Finding…' : 'Find'}
                </button>
              </div>
              <span className="field__hint" role="status">
                {routeStatus === 'error'
                  ? routeError
                  : route
                    ? `${route.from} → ${route.to}, by ${route.method}. One way.`
                    : 'One way. Fill in From and To, or the distance.'}
              </span>
            </div>

            <label className="field field--date">
              <span className="field__label">Date</span>
              <input
                className="field__input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <label className="field field--description">
              <span className="field__label">Description (optional)</span>
              <input
                className="field__input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <LogResult />

            {/* Never disabled: leaving the To box starts a lookup just before this click lands */}
            <button type="submit" className="calculate" aria-busy={routeStatus === 'finding'}>
              {routeStatus === 'finding' ? 'finding…' : 'calculate!'}
            </button>
          </div>
        </form>
      ) : tab === 'Home & Energy' ? (
        <HomeEnergyForm />
      ) : (
        <FoodForm />
      )}
    </section>
  )
}

export default LogPanel
