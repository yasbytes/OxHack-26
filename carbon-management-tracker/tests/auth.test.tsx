import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
  onAuthStateChange: vi.fn(), unsubscribe: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(),
}))
vi.mock('../src/supabase-client', () => ({ default: { auth } }))
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthContextProvider } from '../src/context/AuthContext'
import { routes } from '../src/routes'
import { setLogUser } from '../src/logStore'

const session = {
  access_token: 'test-token', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer',
  user: { id: 'user-one', email: 'person@example.com', user_metadata: { full_name: 'Alex' }, app_metadata: {}, aud: 'authenticated', created_at: '2026-01-01' },
} as Session
let notify: (event: string, session: Session | null) => void

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  setLogUser(null)
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  auth.onAuthStateChange.mockImplementation((callback) => {
    notify = callback
    return { data: { subscription: { unsubscribe: auth.unsubscribe } } }
  })
})
let router: ReturnType<typeof createMemoryRouter>
function renderApp(path = '/') {
  router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<AuthContextProvider><RouterProvider router={router} /></AuthContextProvider>)
}
afterEach(() => { cleanup(); router?.dispose() })

async function showLogin() {
  renderApp()
  await screen.findByRole('heading', { name: 'Log in to your account' })
}

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'a-test-password' } })
}

describe('account access', () => {
  it('redirects a signed-out deep link to login and returns there after signing in', async () => {
    auth.signInWithPassword.mockImplementation(async () => {
      notify('SIGNED_IN', session)
      return { data: { session, user: session.user }, error: null }
    })
    renderApp('/dashboard/history?filter=travel')
    await screen.findByRole('heading', { name: 'Log in to your account' })
    expect(router.state.location.pathname).toBe('/')
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await screen.findByRole('heading', { name: 'History' })
    expect(router.state.location.pathname).toBe('/dashboard/history')
    expect(router.state.location.search).toBe('?filter=travel')
  })

  it('waits for the initial session before redirecting a private URL', async () => {
    let finish!: (result: { data: { session: Session }; error: null }) => void
    auth.getSession.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    renderApp('/dashboard/profile')
    expect(screen.getByRole('status').textContent).toContain('Loading your account')
    expect(router.state.location.pathname).toBe('/dashboard/profile')
    await act(async () => finish({ data: { session }, error: null }))
    await screen.findByRole('heading', { name: 'Profile' })
    expect(router.state.location.pathname).toBe('/dashboard/profile')
  })

  it('uses URLs for navigation and supports going back with one auth subscription', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    renderApp('/dashboard')
    await screen.findByRole('navigation', { name: 'Main' })
    fireEvent.click(screen.getByRole('link', { name: 'History' }))
    await screen.findByRole('heading', { name: 'History' })
    expect(router.state.location.pathname).toBe('/dashboard/history')
    fireEvent.click(screen.getByRole('link', { name: 'Profile' }))
    await screen.findByRole('heading', { name: 'Profile' })
    await act(async () => { await router.navigate(-1) })
    await screen.findByRole('heading', { name: 'History' })
    expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('keeps the session and shows an error when sign-out fails', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    auth.signOut.mockResolvedValue({ error: new Error('Please try logging out again') })
    renderApp('/dashboard/profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Please try logging out again')
    expect(router.state.location.pathname).toBe('/dashboard/profile')
  })

  it('redirects a signed-in visitor away from the signup form', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    renderApp('/signup')
    await screen.findByRole('navigation', { name: 'Main' })
    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it('shows signup errors without navigating to the dashboard', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: new Error('Unable to register') })
    renderApp('/signup')
    await screen.findByRole('heading', { name: 'Create your account' })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } })
    fillCredentials()
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'a-test-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to register')
    expect(router.state.location.pathname).toBe('/signup')
  })

  it('keeps a rejected login outside the dashboard and shows the error', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') })
    await showLogin()
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Invalid login credentials')
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('blocks duplicate submissions while a request is pending', async () => {
    let finish!: (result: { error: null }) => void
    auth.signInWithPassword.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    await showLogin()
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    const button = await screen.findByRole('button', { name: 'Logging in…' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1)
    await act(async () => finish({ error: null }))
  })

  it('validates matching passwords before sending a sign-up request', async () => {
    await showLogin()
    fireEvent.click(screen.getByRole('link', { name: 'Sign up' }))
    await screen.findByRole('heading', { name: 'Create your account' })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } })
    fillCredentials()
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect((await screen.findByRole('alert')).textContent).toContain('passwords do not match')
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('shows email confirmation without granting access when signup has no session', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    await showLogin()
    fireEvent.click(screen.getByRole('link', { name: 'Sign up' }))
    await screen.findByRole('heading', { name: 'Create your account' })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } })
    fillCredentials()
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'a-test-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect((await screen.findByRole('status')).textContent).toContain('Check your email')
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com', options: { data: { full_name: 'Alex' }, emailRedirectTo: window.location.origin },
    }))
  })

  it('opens the dashboard only after the signed-in event and logs out from Profile', async () => {
    auth.signInWithPassword.mockImplementation(async () => {
      notify('SIGNED_IN', session)
      return { data: { session, user: session.user }, error: null }
    })
    auth.signOut.mockImplementation(async () => {
      notify('SIGNED_OUT', null)
      return { error: null }
    })
    await showLogin()
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await screen.findByRole('navigation', { name: 'Main' })
    expect(screen.getByRole('heading', { name: /Alex!/ }).textContent).toContain('Alex')
    fireEvent.click(screen.getByRole('link', { name: 'Profile' }))
    await screen.findByRole('heading', { name: 'Profile' })
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await screen.findByRole('heading', { name: 'Log in to your account' })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('restores a saved session on page load', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    renderApp()
    await screen.findByRole('navigation', { name: 'Main' })
    expect(screen.queryByRole('heading', { name: 'Log in to your account' })).toBeNull()
  })

  it('does not overwrite a new session with a stale startup response', async () => {
    let finish!: (result: { data: { session: null }; error: null }) => void
    auth.getSession.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    renderApp()
    act(() => notify('SIGNED_IN', session))
    await act(async () => finish({ data: { session: null }, error: null }))
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeTruthy()
  })

  it('offers a retryable error when the login request cannot reach Supabase', async () => {
    auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'))
    await showLogin()
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Check your connection')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Log in' }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('sends a password reset email from the login page', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    await showLogin()
    fireEvent.click(screen.getByRole('link', { name: 'Forgot password?' }))
    await screen.findByRole('heading', { name: 'Reset your password' })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect((await screen.findByRole('status')).textContent).toContain('a reset link is on its way')
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  })

  it('sets a new password from the reset link, even when it lands on the home page', async () => {
    auth.updateUser.mockResolvedValue({ data: { user: session.user }, error: null })
    renderApp('/')
    await screen.findByRole('heading', { name: 'Log in to your account' })
    await act(async () => notify('PASSWORD_RECOVERY', session))
    await screen.findByRole('heading', { name: 'Choose a new password' })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-1' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-password-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }))
    await screen.findByRole('heading', { name: /Alex!/ })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-1' })
  })

  it('explains an expired reset link', async () => {
    renderApp('/reset-password')
    await screen.findByRole('heading', { name: 'This link has expired' })
    expect(screen.getByRole('link', { name: 'Send a new link' }).getAttribute('href')).toBe('/forgot-password')
  })
})
