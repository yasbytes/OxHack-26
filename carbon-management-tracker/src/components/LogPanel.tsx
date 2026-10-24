import { useState, type FormEvent } from 'react'
import carIcon from '../assets/icons/car.svg'
import busIcon from '../assets/icons/bus.svg'
import trainIcon from '../assets/icons/train.svg'
import planeIcon from '../assets/icons/plane.svg'
import walkIcon from '../assets/icons/walk.svg'
import bikeIcon from '../assets/icons/bike.svg'

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
  // Only cars log a distance; every other mode logs a start and destination
  distance: number | null
  unit: 'km' | 'mi' | null
  origin: string | null
  destination: string | null
  date: string
  description: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function LogPanel() {
  const [tab, setTab] = useState<Tab>('Travel & Transport')
  const [mode, setMode] = useState<Mode>('car')
  const [fuelType, setFuelType] = useState('Electric')
  const [distance, setDistance] = useState('1')
  const [unit, setUnit] = useState<'km' | 'mi'>('km')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')

  const isCar = mode === 'car'
  const isFlight = mode === 'flight'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const entry: TravelEntry = {
      mode,
      fuelType: isCar ? fuelType : null,
      distance: isCar ? Number(distance) : null,
      unit: isCar ? unit : null,
      origin: isCar ? null : origin,
      destination: isCar ? null : destination,
      date,
      description,
    }
    // TODO: send to the backend calculator once the API exists
    console.log('calculate', entry)
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
            onClick={() => setTab(t)}
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
                onClick={() => setMode(m.id)}
              >
                <img src={m.icon} alt="" className="mode__icon" />
                {m.label}
              </button>
            ))}
          </div>

          <div className="travel__fields">
            {isCar ? (
              <>
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
                      onChange={(e) => setDistance(e.target.value)}
                    />
                    <select
                      className="field__input field__input--unit"
                      aria-label="Distance unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as 'km' | 'mi')}
                    >
                      <option value="km">km</option>
                      <option value="mi">mi</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className="field field--origin">
                  <span className="field__label">
                    {isFlight ? 'Origin airport' : 'Start location'}
                  </span>
                  <input
                    className="field__input"
                    required
                    placeholder={isFlight ? 'Heathrow' : 'e.g. Cowley Road'}
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                </label>
                <label className="field field--destination">
                  <span className="field__label">
                    {isFlight ? 'Destination airport' : 'Destination'}
                  </span>
                  <input
                    className="field__input"
                    required
                    placeholder={isFlight ? 'Amsterdam' : 'e.g. Oxford station'}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </label>
              </>
            )}

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

            <button type="submit" className="calculate">
              calculate!
            </button>
          </div>
        </form>
      ) : (
        <p className="log-panel__empty">Coming soon</p>
      )}
    </section>
  )
}

export default LogPanel
