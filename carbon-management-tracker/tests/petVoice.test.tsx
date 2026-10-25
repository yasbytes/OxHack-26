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

beforeEach(() => setLogUser('demo:alice'))
afterEach(() => { cleanup(); setLogUser(null); localStorage.clear(); played.length = 0 })

it('says its line out loud when clicked', async () => {
  render(<MemoryRouter><PetCard monthKg={10} limitKg={100} /></MemoryRouter>)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Hear/ })))
  expect(screen.getByRole('status').textContent).toBe('Thank you for saving the planet!')
  expect(played).toEqual([expect.stringContaining('thriving')])
})

it('stays quiet once collapsed', () => {
  render(<MemoryRouter><PetCard monthKg={1000} limitKg={100} /></MemoryRouter>)
  expect(screen.queryByRole('button', { name: /^Hear/ })).toBeNull()
})

it('reacts to the logged activity even when its weekly mood is worried', async () => {
  const log = () => addLogItem({ kind: 'travel', date: localDate(), title: 'Bus', detail: '', kg: 2 })
  // An entry from before the card appeared stays quiet
  act(log)
  render(<MemoryRouter><PetCard monthKg={80} limitKg={100} /></MemoryRouter>)
  expect(played).toEqual([])
  await act(async () => log())
  expect(screen.getByRole('status').textContent).toBe('Sharing the ride? Paws up for public transport!')
  expect(played).toEqual([expect.stringContaining('reaction-public-transport')])
})

it('goes back to its mood when clicked after reacting to a log', async () => {
  render(<MemoryRouter><PetCard monthKg={80} limitKg={100} /></MemoryRouter>)
  await act(async () => addLogItem({ kind: 'travel', date: localDate(), title: 'Bus', detail: '', kg: 2 }))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Hear/ })))
  expect(screen.getByRole('status').textContent).toBe("I don't feel too good")
})

it('a collapsed cat stays silent when something is logged', async () => {
  render(<MemoryRouter><PetCard monthKg={1000} limitKg={100} /></MemoryRouter>)
  await act(async () => addLogItem({ kind: 'travel', date: localDate(), title: 'Walk', detail: '', kg: 0 }))
  expect(screen.queryByRole('status')).toBeNull()
  expect(played).toEqual([])
})

it('is knocked down as soon as the month goes over the limit', () => {
  render(<MemoryRouter><PetCard monthKg={367} limitKg={365} /></MemoryRouter>)
  expect(screen.getByLabelText(/is sick$/)).toBeTruthy()
  render(<MemoryRouter><PetCard monthKg={360} limitKg={365} /></MemoryRouter>)
  expect(screen.getByLabelText(/is miserable$/)).toBeTruthy()
})
