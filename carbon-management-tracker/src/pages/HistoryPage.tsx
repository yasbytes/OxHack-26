import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import {
  deleteLogItem,
  updateLogItem,
  useLog,
  type LogItem,
  type LogKind,
} from '../logStore.ts'

const FILTERS: { id: LogKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'travel', label: 'Travel' },
  { id: 'energy', label: 'Energy' },
  { id: 'food', label: 'Food' },
  { id: 'quick', label: 'Quick log' },
]

const KIND_LABELS: Record<LogKind, string> = {
  travel: 'Travel',
  energy: 'Energy',
  food: 'Food',
  quick: 'Quick log',
}

function dayLabel(date: string) {
  const day = new Date(`${date}T00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}

// Newest day first, and newest entry first within a day
function groupByDay(items: LogItem[]) {
  const sorted = [...items].sort(
    (a, b) => b.date.localeCompare(a.date) || b.loggedAt - a.loggedAt,
  )
  const groups: { date: string; items: LogItem[] }[] = []
  for (const item of sorted) {
    const last = groups[groups.length - 1]
    if (last?.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }
  return groups
}

function HistoryPage() {
  const navigate = useNavigate()
  const items = useLog()
  const [filter, setFilter] = useState<LogKind | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ date: '', title: '', detail: '' })
  const [toDelete, setToDelete] = useState<LogItem | null>(null)

  const shown = filter === 'all' ? items : items.filter((i) => i.kind === filter)
  const groups = groupByDay(shown)

  function startEditing(item: LogItem) {
    setEditingId(item.id)
    setDraft({ date: item.date, title: item.title, detail: item.detail })
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (editingId) updateLogItem(editingId, draft)
    setEditingId(null)
  }

  function confirmDelete() {
    if (toDelete) deleteLogItem(toDelete.id)
    setToDelete(null)
  }

  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">History</h1>
      </header>

      <section className="card history">
        <div className="modes" role="radiogroup" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={filter === f.id}
              className={`mode mode--small${filter === f.id ? ' mode--selected' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="history__empty">
            <p>Nothing logged yet. Entries you add on the home page will show up here.</p>
            <button type="button" className="calculate" onClick={() => void navigate('/dashboard')}>
              log something
            </button>
          </div>
        ) : groups.length === 0 ? (
          <p className="history__empty">No {KIND_LABELS[filter as LogKind].toLowerCase()} entries yet.</p>
        ) : (
          groups.map((g) => (
            <div key={g.date} className="history__day">
              <h2 className="history__date">{dayLabel(g.date)}</h2>
              <ul className="history__list">
                {g.items.map((item) =>
                  item.id === editingId ? (
                    <li key={item.id} className="history__item history__item--editing">
                      <form className="history__edit" onSubmit={saveEdit}>
                        <label className="field">
                          <span className="field__label">What</span>
                          <input
                            className="field__input"
                            required
                            autoFocus
                            value={draft.title}
                            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span className="field__label">Details</span>
                          <input
                            className="field__input"
                            value={draft.detail}
                            onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span className="field__label">Date</span>
                          <input
                            className="field__input"
                            type="date"
                            required
                            value={draft.date}
                            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                          />
                        </label>
                        <div className="history__edit-actions">
                          <button
                            type="button"
                            className="history__link"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button type="submit" className="calculate">
                            save
                          </button>
                        </div>
                      </form>
                    </li>
                  ) : (
                    <li key={item.id} className="history__item">
                      <span className={`history__tag history__tag--${item.kind}`}>
                        {KIND_LABELS[item.kind]}
                      </span>
                      <div className="history__text">
                        <span className="history__title">{item.title}</span>
                        {item.detail && <span className="history__detail">{item.detail}</span>}
                      </div>
                      <span className="history__kg">
                        {item.kg === null ? 'Not calculated yet' : `${item.kg.toFixed(1)} kg CO₂e`}
                      </span>
                      <button
                        type="button"
                        className="history__link"
                        aria-label={`Edit ${item.title}`}
                        onClick={() => startEditing(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="history__link history__link--delete"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setToDelete(item)}
                      >
                        Delete
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))
        )}
      </section>

      {toDelete && (
        <ConfirmDialog
          title="Delete this entry?"
          message={`"${toDelete.title}" will be removed from your history. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </main>
  )
}

export default HistoryPage
