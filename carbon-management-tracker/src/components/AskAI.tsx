import { useState, type FormEvent } from 'react'
// Gemini API: see backend ai.py and journey.py
// Empty string means "same origin", so the Vite proxy forwards /api to the backend
const API = import.meta.env.VITE_API_URL ?? ''

type Option = { mode: string; label: string; kg: number }
type Reply = {
  kind: 'journey' | 'general'
  advice: string
  origin?: string
  destination?: string
  distance_km?: number
  options?: Option[]
  chosen?: string
  saved_kg?: number
}

function AskAI() {
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<Reply | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ask(e: FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setError('')
    setReply(null)
    try {
      const res = await fetch(`${API}/api/journey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      if (!res.ok) throw new Error('bad response')
      setReply(await res.json())
    } catch {
      setError("Couldn't get an answer just now. Is the backend running? Try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  const chosen = reply?.options?.find((o) => o.mode === reply.chosen)
  const saved = reply?.saved_kg ?? 0

  return (
    <>
      <form className="quick-log-row" onSubmit={ask}>
        <section className="card quick-log">
          <label className="quick-log__label" htmlFor="ask-ai">
            <span className="card__title">Ask Gemini</span>
            <span className="quick-log__hint">a journey or any carbon question</span>
          </label>
          <textarea
            id="ask-ai"
            className="quick-log__input"
            required
            placeholder="e.g. Is the train from Manchester to London greener than driving?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
          />
        </section>
        <div className="card quick-log__submit-card">
          <button type="submit" className="quick-log__submit" disabled={loading}>
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </form>

      {error && (
        <section className="card" role="alert">
          <p>{error}</p>
        </section>
      )}

      {reply && (
        <section className="card" aria-live="polite">
          {reply.kind === 'journey' && chosen && (
            <p>
              <strong>
                {reply.origin} to {reply.destination} · {reply.distance_km} km
              </strong>
              <br />
              {chosen.label}: {chosen.kg} kg CO₂e ·{' '}
              {saved > 0
                ? `saves ${saved} kg vs driving`
                : saved < 0
                  ? `adds ${Math.abs(saved)} kg vs driving`
                  : 'same as driving'}
            </p>
          )}

          <p>{reply.advice}</p>

          {reply.kind === 'journey' && reply.options && (
            <details className="chart-table" open>
              <summary>Compare options</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Option</th>
                    <th scope="col">kg CO₂e</th>
                  </tr>
                </thead>
                <tbody>
                  {reply.options.map((o) => (
                    <tr key={o.mode}>
                      <td>{o.label}</td>
                      <td>{o.kg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          <p className="chart-card__sub">Estimates only. Distances and emission factors are approximate.</p>
        </section>
      )}
    </>
  )
}

export default AskAI