import { useState, type FormEvent } from 'react'
import { addLogItem } from '../logStore.ts'
import LogResult from './LogResult.tsx'
import { billKg, homeEstimateKg, PERIOD_DAYS } from '../estimates.ts'

const METHODS = [
  { id: 'bill', label: 'From my bill' },
  { id: 'estimate', label: 'Estimate it' },
  { id: 'describe', label: 'Describe it' },
] as const
type Method = (typeof METHODS)[number]['id']

const MAIN_FUELS = [
  { id: 'electricity', label: 'Electricity' },
  { id: 'gas', label: 'Gas & heating' },
] as const
// Less common fuels sit behind "More options" so the main choice stays simple
const OTHER_FUELS = [
  { id: 'oil', label: 'Heating oil' },
  { id: 'lpg', label: 'LPG' },
] as const
type Fuel = (typeof MAIN_FUELS)[number]['id'] | (typeof OTHER_FUELS)[number]['id']

// Most people know what they paid, so £ comes first for every fuel
const UNITS: Record<Fuel, string[]> = {
  electricity: ['£', 'kWh'],
  gas: ['£', 'kWh', 'm³'],
  oil: ['£', 'litres'],
  lpg: ['£', 'litres'],
}

const PERIODS = [
  { id: 'week', label: 'One week' },
  { id: 'month', label: 'One month' },
  { id: 'quarter', label: 'Three months' },
  { id: 'year', label: 'One year' },
] as const
type Period = (typeof PERIODS)[number]['id']

const HOME_TYPES = ['Flat', 'Terraced house', 'Semi-detached house', 'Detached house']
const BEDROOMS = ['Studio', '1', '2', '3', '4', '5+']
const HEATING_TYPES = [
  'Gas boiler',
  'Electric heaters',
  'Heat pump',
  'Heating oil',
  'LPG',
  'Not sure',
]

export type HomeEnergyEntry =
  | {
      method: 'bill'
      fuel: Fuel
      // The backend converts £ and m³ to kWh before applying carbon factors
      amount: number
      unit: string
      period: Period
      periodEnd: string
      occupants: number
    }
  | {
      method: 'estimate'
      homeType: string
      bedrooms: string
      heating: string
      occupants: number
      date: string
    }
  | {
      // Gemini extracts fuel, amount and period, and asks for anything missing
      method: 'describe'
      text: string
      date: string
    }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function HomeEnergyForm() {
  const [method, setMethod] = useState<Method>('bill')
  const [fuel, setFuel] = useState<Fuel>('electricity')
  const [showMoreFuels, setShowMoreFuels] = useState(false)
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('£')
  const [period, setPeriod] = useState<Period>('month')
  const [date, setDate] = useState(today)
  const [occupants, setOccupants] = useState('1')
  const [homeType, setHomeType] = useState(HOME_TYPES[0])
  const [bedrooms, setBedrooms] = useState('2')
  const [heating, setHeating] = useState(HEATING_TYPES[0])
  const [text, setText] = useState('')

  function chooseFuel(f: Fuel) {
    setFuel(f)
    if (!UNITS[f].includes(unit)) setUnit('£')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    let entry: HomeEnergyEntry
    if (method === 'bill') {
      entry = {
        method,
        fuel,
        amount: Number(amount),
        unit,
        period,
        periodEnd: date,
        occupants: Number(occupants),
      }
    } else if (method === 'estimate') {
      entry = { method, homeType, bedrooms, heating, occupants: Number(occupants), date }
    } else {
      entry = { method, text, date }
    }
    // TODO: send to the backend calculator once the API exists
    console.log('calculate', entry)
    addLogItem({ kind: 'energy', date, ...energySummary(), ...energyKg() })
  }

  // "Describe it" needs Gemini to read the text, so it has no estimate yet
  function energyKg() {
    const people = Number(occupants)
    if (method === 'bill') {
      return { kg: billKg(fuel, Number(amount), unit, people), spreadDays: PERIOD_DAYS[period] }
    }
    if (method === 'estimate') {
      return { kg: homeEstimateKg(homeType, bedrooms, heating, people), spreadDays: 30 }
    }
    return { kg: null }
  }

  function energySummary() {
    if (method === 'bill') {
      const fuelLabel = [...MAIN_FUELS, ...OTHER_FUELS].find((f) => f.id === fuel)?.label
      const periodLabel = PERIODS.find((p) => p.id === period)?.label.toLowerCase()
      const shown = unit === '£' ? `£${amount}` : `${amount} ${unit}`
      return {
        title: `${fuelLabel} bill`,
        detail: `${shown} for ${periodLabel} · split ${occupants} ways`,
      }
    }
    if (method === 'estimate') {
      return {
        title: 'Home energy estimate',
        detail: `${homeType}, ${bedrooms} bedrooms, ${heating} · ${occupants} people`,
      }
    }
    return { title: 'Energy description', detail: text }
  }

  const fuelButtons = showMoreFuels ? [...MAIN_FUELS, ...OTHER_FUELS] : MAIN_FUELS

  const occupantsField = (
    <label className="field">
      <span className="field__label">People sharing this bill</span>
      <input
        className="field__input"
        type="number"
        min="1"
        step="1"
        required
        value={occupants}
        onChange={(e) => setOccupants(e.target.value)}
      />
      <span className="field__hint">We split it so you only count your share.</span>
    </label>
  )

  return (
    <form className="energy" onSubmit={handleSubmit}>
      <div className="modes" role="radiogroup" aria-label="How to log your energy">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={method === m.id}
            className={`mode${method === m.id ? ' mode--selected' : ''}`}
            onClick={() => setMethod(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {method === 'bill' && (
        <>
          <div className="energy__fuels" role="radiogroup" aria-label="Energy type">
            {fuelButtons.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={fuel === f.id}
                className={`mode mode--small${fuel === f.id ? ' mode--selected' : ''}`}
                onClick={() => chooseFuel(f.id)}
              >
                {f.label}
              </button>
            ))}
            {!showMoreFuels && (
              <button
                type="button"
                className="energy__more"
                onClick={() => setShowMoreFuels(true)}
              >
                More options
              </button>
            )}
          </div>

          <div className="energy__fields">
            <div className="field">
              <label className="field__label" htmlFor="energy-amount">
                How much was it?
              </label>
              <div className="field__row">
                <input
                  id="energy-amount"
                  className="field__input"
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder={unit === '£' ? 'e.g. 70' : 'e.g. 180'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <select
                  className="field__input field__input--unit"
                  aria-label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {UNITS[fuel].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
              <span className="field__hint">
                {unit === '£'
                  ? 'The total on your bill is fine.'
                  : 'Use the usage figure printed on your bill.'}
              </span>
            </div>

            <label className="field">
              <span className="field__label">Period it covers</span>
              <select
                className="field__input"
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
              >
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Bill period ending</span>
              <input
                className="field__input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            {occupantsField}
          </div>
        </>
      )}

      {method === 'estimate' && (
        <div className="energy__fields">
          <label className="field">
            <span className="field__label">Home type</span>
            <select
              className="field__input"
              value={homeType}
              onChange={(e) => setHomeType(e.target.value)}
            >
              {HOME_TYPES.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Bedrooms</span>
            <select
              className="field__input"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
            >
              {BEDROOMS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">How is it heated?</span>
            <select
              className="field__input"
              value={heating}
              onChange={(e) => setHeating(e.target.value)}
            >
              {HEATING_TYPES.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>

          {occupantsField}

          <p className="energy__note">
            We'll estimate a month of electricity and heating for a home like yours. It's
            marked as an estimate, and you can swap in real bills later.
          </p>
        </div>
      )}

      {method === 'describe' && (
        <div className="energy__fields">
          <label className="field energy__describe">
            <span className="field__label">Tell us about your energy use</span>
            <textarea
              className="field__input energy__textarea"
              required
              placeholder="e.g. My electric bill was about £70 last month, split between 3 of us"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="field__hint">We'll ask if anything's missing.</span>
          </label>
        </div>
      )}

      <div className="energy__actions">
        <LogResult />
        <button type="submit" className="calculate">
          calculate!
        </button>
      </div>
    </form>
  )
}

export default HomeEnergyForm
