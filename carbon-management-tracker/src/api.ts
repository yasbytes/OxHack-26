import supabase from './supabase-client'
import type { LogItem } from './logStore.ts'

// The FastAPI backend (backend/app/main.py). In development Vite forwards /api
// to it; a deployed front end sets VITE_API_URL to wherever it runs.
const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') ?? ''

export type ParsedEntry = Pick<LogItem, 'kind' | 'title' | 'detail' | 'kg'>

// Sends the signed-in user's token so the backend knows who's asking
async function post<T>(path: string, body: unknown): Promise<T> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`API ${response.status}`)
  return (await response.json()) as T
}

// Gemini reads the activities in a quick log; the backend works out their kg
export async function parseQuickLog(text: string) {
  const { entries } = await post<{ entries: ParsedEntry[] }>('/api/parse-log', { text })
  return entries
}
