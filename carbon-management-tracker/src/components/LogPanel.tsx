import { useState, type FormEvent } from 'react'
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
  const [distance, setDistance] = useState('1')
  const [unit, setUnit] = useState<'km' | 'mi'>('km')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState(() => localDate())
  const [description, setDescription] = useState('')
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routeStatus, setRouteStatus] = useState<'idle' | 'finding' | 'error'>('idle')
  const [routeError, setRouteError] = useState('')

  const isCar = mode === 'car'
  const isFlight = mode === 'flight'
  const canFind = origin.trim() !== '' && destination.trim() !== '' && routeStatus !== 'finding'

  // A found distance no longer applies once the trip changes
  function changeTrip(update: () => void) {
    update()
    setRoute(null)
    setRouteStatus('idle')
  }

  async function findDistance() {
    setRouteStatus('finding')
    try {
      const found = await findRoute(mode, origin, destination)
      setDistance(inUnit(found.km, unit))
      setRoute(found)
      setRouteStatus('idle')
    } catch (error) {
      setRouteError(
        error instanceof RouteError ? error.message : "Couldn't reach the map service. Type the distance instead.",
      )
      setRouteStatus('error')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const entry: TravelEntry = {
      mode,
      fuelType: isCar ? fuelType : null,
      distance: Number(distance),
      unit,
      origin: origin || null,
      destination: destination || null,
      date,
      description,
    }
    // TODO: send to the backend calculator once the API exists
    console.log('calculate', entry)
    const modeLabel = MODES.find((m) => m.id === mode)?.label ?? mode
    const places = route ? `${route.from} → ${route.to}` : origin || destination ? `${origin || '?'} → ${destination || '?'}` : ''
    const trip = [places, `${distance} ${unit}`].filter(Boolean).join(' · ')
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
              <span className="field__label">{isFlight ? 'From airport' : 'From'} (optional)</span>
              <input
                className="field__input"
                placeholder={isFlight ? 'e.g. Heathrow' : 'e.g. Oxford station'}
                value={origin}
                onChange={(e) => changeTrip(() => setOrigin(e.target.value))}
              />
            </label>
            <label className="field field--destination">
              <span className="field__label">{isFlight ? 'To airport' : 'To'} (optional)</span>
              <input
                className="field__input"
                placeholder={isFlight ? 'e.g. Amsterdam' : 'e.g. London Paddington'}
                value={destination}
                onChange={(e) => changeTrip(() => setDestination(e.target.value))}
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
                Distance
              </label>
              <div className="field__row">
                <input
                  id="distance"
                  className="field__input field__input--distance"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={distance}
                  onChange={(e) => changeTrip(() => setDistance(e.target.value))}
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
                    : 'One way. Fill in From and To and press Find, or type it.'}
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

            <button type="submit" className="calculate">
              calculate!
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
