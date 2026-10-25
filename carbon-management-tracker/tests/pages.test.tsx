import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../src/supabase-client', () => ({ default: null }))
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthContextProvider } from '../src/context/AuthContext'
import { routes } from '../src/routes'
afterEach(cleanup)
// jsdom has no ResizeObserver, which the projection chart uses
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
const paths = ['/dashboard', '/dashboard/insights', '/dashboard/history', '/dashboard/friends', '/dashboard/shop', '/dashboard/profile']
for (const withData of [false, true]) for (const p of paths) {
  it(`${p} renders ${withData ? 'with old data' : 'fresh'}`, async () => {
    localStorage.clear()
    localStorage.setItem('demo-session', JSON.stringify({ email: 'a@b.com', name: 'A' }))
    if (withData) {
      localStorage.setItem('carbon-log:demo:a@b.com', JSON.stringify([
        { id: '1', kind: 'travel', date: new Date().toISOString().slice(0,10), title: 't', detail: '', kg: 3, loggedAt: Date.now() },
        { id: '2', kind: 'quick', date: '2025-01-01', title: 'q', detail: '', kg: null },
        { id: '3', kind: 'food', date: new Date().toISOString().slice(0,10), title: 'f', detail: '' },
      ]))
      localStorage.setItem('profile', JSON.stringify({ limitTonnes: 6, name: 'Old' }))
      localStorage.setItem('friends', '{"not":"an array"}')
    }
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(" ")) })
    render(<AuthContextProvider><RouterProvider router={createMemoryRouter(routes, { initialEntries: [p] })} /></AuthContextProvider>)
    await new Promise((r) => setTimeout(r, 300))
    spy.mockRestore()
    expect(document.querySelector('main'), String(errors[0]).slice(0, 300)).not.toBeNull()
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
  })
}
