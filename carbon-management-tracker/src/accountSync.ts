import { cloudFor, reportSyncError } from './cloud'

type Change =
  | { type: 'upsert'; row: Record<string, unknown> }
  | { type: 'delete'; id?: string }

// A durable, ordered outbox. An explicit owner on every query prevents a late
// request from writing one account's cached data into the next account.
export function createAccountSync(table: 'log_items' | 'profiles' | 'shop_state') {
  let owner: string | null = null
  let changes: Change[] = []
  let revision = 0
  let running: Promise<boolean> | null = null
  let generation = 0
  const key = () => `pending:${table}:${owner}`
  function persist() {
    try { localStorage.setItem(key(), JSON.stringify(changes)) }
    catch { reportSyncError(new Error('Browser storage unavailable; keep this tab open until synced.')) }
  }

  async function send(): Promise<boolean> {
    const user = owner
    const version = generation
    const cloud = cloudFor(user)
    if (!cloud || !user) return true
    try {
      while (changes.length && generation === version) {
        const change = changes[0]
        const query = cloud.from(table)
        const response = change.type === 'upsert'
          ? await query.upsert({ ...change.row, user_id: user })
          : await (change.id
            ? query.delete().eq('user_id', user).eq('id', change.id)
            : query.delete().eq('user_id', user))
        if (response.error) throw response.error
        if (generation !== version) return false
        changes.shift()
        persist()
      }
      return generation === version
    } catch (error) {
      reportSyncError(error)
      return false
    }
  }

  function flush(): Promise<boolean> {
    // Wait for any previous account's in-flight request before starting another.
    if (running) return running.then(() => changes.length ? flush() : true)
    running = send().finally(() => { running = null })
    return running
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { void flush() })
    window.addEventListener('focus', () => { void flush() })
  }

  return {
    setUser(user: string | null) {
      if (owner === user) return
      owner = user
      generation++
      revision++
      try { changes = JSON.parse(localStorage.getItem(key()) ?? '[]') }
      catch { changes = [] }
    },
    enqueue(change: Change) {
      revision++
      if (!cloudFor(owner)) return
      changes.push(change)
      persist()
      void flush()
    },
    flush,
    get revision() { return revision },
    get pending() { return changes.length > 0 },
  }
}
