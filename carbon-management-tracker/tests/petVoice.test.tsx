import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PetCard from '../src/components/PetCard'
import { addLogItem, setLogUser } from '../src/logStore'
import { localDate } from '../src/dates'

const played: string[] = []
class FakeAudio extends EventTarget {
  constructor(public src: string) { super(); played.push(src) }
  play() { return Promise.resolve() }
  pause() {}
}
vi.stubGlobal('Audio', FakeAudio)

beforeEach(() => setLogUser('alice'))
afterEach(() => { cleanup(); setLogUser(null); localStorage.clear(); played.length = 0 })

it('says its line out loud when clicked', async () => {
  render(<MemoryRouter><PetCard weekKg={10} budgetKg={100} /></MemoryRouter>)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Hear/ })))
  expect(screen.getByRole('status').textContent).toBe('Thank you for saving the planet!')
  expect(played).toEqual([expect.stringContaining('thriving')])
})

it('stays quiet once collapsed', () => {
  render(<MemoryRouter><PetCard weekKg={1000} budgetKg={100} /></MemoryRouter>)
  expect(screen.queryByRole('button', { name: /^Hear/ })).toBeNull()
})

it('speaks up whenever something is logged, in its current mood', async () => {
  const log = () => addLogItem({ kind: 'travel', date: localDate(), title: 'Bus', detail: '', kg: 2 })
  // An entry from before the card appeared stays quiet
  act(log)
  render(<MemoryRouter><PetCard weekKg={110} budgetKg={100} /></MemoryRouter>)
  expect(played).toEqual([])
  await act(async () => log())
  expect(screen.getByRole('status').textContent).toBe("I don't feel too good")
  expect(played).toEqual([expect.stringContaining('worried')])
})
