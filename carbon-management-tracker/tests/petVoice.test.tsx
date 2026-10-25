import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import PetCard from '../src/components/PetCard'

const played: string[] = []
class FakeAudio extends EventTarget {
  constructor(public src: string) { super(); played.push(src) }
  play() { return Promise.resolve() }
  pause() {}
}
vi.stubGlobal('Audio', FakeAudio)

afterEach(cleanup)

it('says its line out loud when clicked', async () => {
  render(<MemoryRouter><PetCard weekKg={10} budgetKg={100} /></MemoryRouter>)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Hear/ })))
  expect(screen.getByRole('status').textContent).toBe('Thank you for saving the planet!')
  expect(played).toEqual(['/api/cat-voice/thriving'])
})

it('stays quiet once collapsed', () => {
  render(<MemoryRouter><PetCard weekKg={1000} budgetKg={100} /></MemoryRouter>)
  expect(screen.queryByRole('button', { name: /^Hear/ })).toBeNull()
})
