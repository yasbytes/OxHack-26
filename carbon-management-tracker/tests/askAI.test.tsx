import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import AskAI from '../src/components/AskAI'

afterEach(cleanup)

it('shows the backend setup message when Gemini is not configured', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
    detail: 'Add GEMINI_API_KEY to backend/.env, then restart the backend.',
  }), { status: 503 }))
  render(<AskAI />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Should I take the train?' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Add GEMINI_API_KEY to backend/.env')
})
