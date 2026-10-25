import { useState, type FormEvent } from 'react'
import { addLogItem } from '../logStore.ts'
import LogResult from './LogResult.tsx'
import { foodKg } from '../estimates.ts'
import { DIETS, useProfile } from '../profileStore.ts'
import { localDate } from '../dates.ts'

// Broad categories rather than ingredients, since most people don't know grams
const CATEGORIES = [
  { id: 'beef', label: 'Beef' },
  { id: 'lamb', label: 'Lamb' },
  { id: 'other_meat', label: 'Chicken / pork' },
  { id: 'fish', label: 'Fish / seafood' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'not_sure', label: 'Not sure' },
] as const
type Category = (typeof CATEGORIES)[number]['id']

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const PORTIONS = [
  { servings: 0.5, label: 'Small' },
  { servings: 1, label: 'Normal' },
  { servings: 2, label: 'Large' },
] as const

export type FoodEntry = {
  category: Category
  mealType: string
  servings: number
  date: string
  // Optional detail, e.g. "chicken curry with rice", for a closer estimate
  description: string
}


function FoodForm() {
  const { diet } = useProfile()
  // Start on what the person usually eats, from their profile
  const [category, setCategory] = useState<Category>(
    () => DIETS.find((d) => d.id === diet)?.food ?? 'other_meat',
  )
  const [mealType, setMealType] = useState('Dinner')
  const [servings, setServings] = useState('1')
  const [date, setDate] = useState(() => localDate())
  const [description, setDescription] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const entry: FoodEntry = {
      category,
      mealType,
      servings: Number(servings),
      date,
      description,
    }
    // TODO: send to the backend calculator once the API exists
    console.log('calculate', entry)
    const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label
    const portionLabel = PORTIONS.find((p) => p.servings === Number(servings))?.label
    addLogItem({
      kind: 'food',
      date,
      title: `${mealType}: ${categoryLabel}`,
      detail: [`${portionLabel} portion`, description].filter(Boolean).join(' · '),
      kg: foodKg(category, mealType, Number(servings)),
    })
  }

  return (
    <form className="energy" onSubmit={handleSubmit}>
      <div className="modes" role="radiogroup" aria-label="What did you eat?">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={category === c.id}
            className={`mode${category === c.id ? ' mode--selected' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="energy__fields food__fields">
        <label className="field">
          <span className="field__label">Meal</span>
          <select
            className="field__input"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            {MEAL_TYPES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Portion size</span>
          <select
            className="field__input"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          >
            {PORTIONS.map((p) => (
              <option key={p.servings} value={p.servings}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Date eaten</span>
          <input
            className="field__input"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="field energy__describe">
          <span className="field__label">Description (optional)</span>
          <input
            className="field__input"
            placeholder="e.g. chicken curry with rice"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className="field__hint">Adding detail gives a closer estimate.</span>
        </label>
      </div>

      <div className="energy__actions">
        <LogResult />
        <button type="submit" className="calculate">
          calculate meal
        </button>
      </div>
    </form>
  )
}

export default FoodForm
