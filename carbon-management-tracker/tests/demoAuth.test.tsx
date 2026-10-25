import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
// No Supabase keys: the app falls back to demo accounts saved in this browser
vi.mock('../src/supabase-client', () => ({ default: null }))
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthContextProvider } from '../src/context/AuthContext'
import { routes } from '../src/routes'
import { setLogUser } from '../src/logStore'

let router: ReturnType<typeof createMemoryRouter>
function renderApp(path = '/') {
  router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<AuthContextProvider><RouterProvider router={router} /></AuthContextProvider>)
}

function type(id: string, value: string) {
  fireEvent.change(document.getElementById(id)!, { target: { value } })
}

beforeEach(() => { localStorage.clear(); setLogUser(null) })
afterEach(() => { cleanup(); router?.dispose() })

it('signs up, logs out and logs back in without Supabase', async () => {
  renderApp('/signup')
  await screen.findByRole('heading', { name: 'Create your account' })
  type('signup-name', 'Sam')
  type('signup-email', 'Sam@Example.com')
  type('signup-password', 'password1')
  type('signup-confirm', 'password1')
  fireEvent.click(screen.getByRole('button', { name: /sign up|create/i }))
  await screen.findByRole('heading', { name: /Sam!/ })
  expect(router.state.location.pathname).toBe('/dashboard')

  fireEvent.click(screen.getByRole('link', { name: 'Profile' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))
  await screen.findByRole('heading', { name: 'Log in to your account' })

  type('signin-email', 'sam@example.com')
  type('signin-password', 'anything')
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
  await screen.findByRole('heading', { name: /Sam!/ })
})

it('keeps a demo login after a reload', async () => {
  renderApp()
  await screen.findByRole('heading', { name: 'Log in to your account' })
  type('signin-email', 'alex@example.com')
  type('signin-password', 'anything')
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
  await screen.findByRole('heading', { name: /Alex!/ })

  cleanup()
  router.dispose()
  renderApp('/dashboard')
  await screen.findByRole('heading', { name: /Alex!/ })
})
