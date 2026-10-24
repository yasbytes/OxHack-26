import { clearLastAdded, useLastAdded } from '../logStore.ts'
import { useFootprint } from '../footprint.ts'
import { moodFor } from '../pet.ts'
import { WEEKLY_BUDGET_KG } from '../sampleData.ts'

// Sits in the form's spare space right after something is logged, so the
// result is visible without scrolling up to the footprint card and pet
function LogResult() {
  const item = useLastAdded()
  const { weekKg } = useFootprint()
  if (!item) return null

  const mood = moodFor(weekKg, WEEKLY_BUDGET_KG)
  const week = Math.round(weekKg)
  const zero = item.kg === 0

  return (
    <div className="result" role="status">
      {!zero && (
        <img src={mood.image} alt="" className={`result__pet result__pet--${mood.id}`} />
      )}

      <div className="result__main">
        {item.kg === null ? (
          <>
            <p className="result__value">Saved</p>
            <p className="result__text">We can't estimate free text yet.</p>
          </>
        ) : zero ? (
          <>
            <p className="result__value">Good job!</p>
            <p className="result__text">0 kg CO₂e, zero emissions</p>
          </>
        ) : (
          <>
            <p className="result__value">
              {item.kg < 10 ? item.kg.toFixed(1) : Math.round(item.kg)} kg CO₂e
            </p>
            <p className="result__text">
              {Math.round((item.kg / WEEKLY_BUDGET_KG) * 100)}% of your weekly budget
            </p>
          </>
        )}
        <p className="result__text">
          Week: <strong>{week}</strong> / {WEEKLY_BUDGET_KG} kg
        </p>
      </div>

      <button
        type="button"
        className="result__close"
        aria-label="Dismiss result"
        onClick={clearLastAdded}
      >
        ×
      </button>
    </div>
  )
}

export default LogResult
