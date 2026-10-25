import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { LogItem } from '../src/logStore'

const log = vi.hoisted(() => ({ current: null as LogItem | null }))
vi.mock('../src/logStore', () => ({ useLastAdded: () => log.current }))
vi.mock('../src/profileStore', () => ({ useProfile: () => ({ petName: 'Mog' }), updateProfile: vi.fn() }))
vi.mock('../src/shopStore', () => ({
  useShop: () => ({ coins: 120, owned: {} }), useFed: () => ({ fed: false, hoursLeft: 0 }),
  SHOP_ITEMS: [], feedItem: vi.fn(),
}))
vi.mock('../src/petReactions', () => ({ reactionFor: (entry: LogItem) => ({ says: entry.title, voice: `/reaction-${entry.id}.mp3` }) }))
import PetCard from '../src/components/PetCard'

const clips: FakeAudio[] = []
class FakeAudio {
  src: string
  handlers: Record<string, () => void> = {}
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  constructor(src: string) { this.src = src; clips.push(this) }
  addEventListener(event: string, handler: () => void) { this.handlers[event] = handler }
}
const card = () => <MemoryRouter><PetCard monthKg={1} limitKg={50} /></MemoryRouter>
const entry = (id: string, title: string): LogItem => ({ id, title, kind: 'food', detail: '', date: '2026-10-25', loggedAt: 1, kg: 1 })

beforeEach(() => { log.current = null; clips.length = 0; vi.stubGlobal('Audio', FakeAudio) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('plays each new activity once and lets clicking the cat replay it', () => {
  const view = render(card())
  expect(clips).toHaveLength(0)
  log.current = entry('meat', 'A meaty meal!')
  view.rerender(card())
  expect(screen.getByRole('status').textContent).toBe('A meaty meal!')
  expect(clips.at(-1)?.src).toBe('/reaction-meat.mp3')
  view.rerender(card())
  expect(clips).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Hear Mog' }))
  expect(clips).toHaveLength(2)
  expect(clips[0].pause).toHaveBeenCalled()
})

it('does not automatically replay an existing entry on mount', () => {
  log.current = entry('old', 'Old entry')
  render(card())
  expect(clips).toHaveLength(0)
})

it('keeps the new caption when an interrupted older clip ends', () => {
  const view = render(card())
  log.current = entry('one', 'First meal')
  view.rerender(card())
  log.current = entry('two', 'Second meal')
  view.rerender(card())
  clips[0].handlers.ended()
  expect(screen.getByRole('status').textContent).toBe('Second meal')
  view.unmount()
  expect(clips[1].pause).toHaveBeenCalled()
})
