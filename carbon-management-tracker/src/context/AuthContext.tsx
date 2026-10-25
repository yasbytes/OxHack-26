import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import supabase from '../supabase-client'
import { authErrorMessage } from '../auth-errors'
import { setLogUser } from '../logStore'
import { setShopUser } from '../shopStore'
import { nameFromEmail } from '../profileStore'

type AuthResult = {
  success: boolean
  data?: { session: Session | null; user: User | null }
  error?: string
}
type AuthContextValue = {
  session: Session | null | undefined
  error: string | null
  configured: boolean
  // True after opening a password reset link, until a new password is saved
  recovering: boolean
  signInUser: (email: string, password: string) => Promise<AuthResult>
  signUpUser: (email: string, password: string, name: string) => Promise<AuthResult>
  signOutUser: () => Promise<{ success: boolean; error?: string }>
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>
}

const DEMO_PASSWORD_ERROR = 'Demo mode has no passwords to reset. Log in with any password.'

const AuthContext = createContext<AuthContextValue | null>(null)

// Demo mode: without Supabase keys, any email and password logs in and the
// account lives only in this browser. Real auth takes over once keys are set.
const DEMO_SESSION_KEY = 'demo-session'
const DEMO_NAMES_KEY = 'demo-names'

type DemoUser = { email: string; name: string }

function readJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be blocked (private windows); the login still works for this visit
  }
}

// Only the fields the app reads, shaped like a Supabase session
function demoSession({ email, name }: DemoUser) {
  return {
    user: { id: `demo:${email}`, email, user_metadata: { full_name: name } },
  } as unknown as Session
}

function loadDemoSession() {
  const user = readJson<DemoUser | null>(DEMO_SESSION_KEY, null)
  return user ? demoSession(user) : null
}

// Same pattern as the course: one provider owns the session and all auth actions.
export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(() => {
    if (supabase) return undefined
    const demo = loadDemoSession()
    setLogUser(demo?.user.id ?? null)
    setShopUser(demo?.user.id ?? null)
    return demo
  })
  const [error, setError] = useState<string | null>(null)
  const [recovering, setRecovering] = useState(false)

  function startDemoSession(user: DemoUser | null) {
    writeJson(DEMO_SESSION_KEY, user)
    const next = user ? demoSession(user) : null
    setLogUser(next?.user.id ?? null)
    setShopUser(next?.user.id ?? null)
    setSession(next)
    return next
  }

  useEffect(() => {
    if (!supabase) return
    let active = true
    let receivedEvent = false

    function update(nextSession: Session | null, nextError: string | null = null) {
      if (!active) return
      setLogUser(nextSession?.user.id ?? null)
      setShopUser(nextSession?.user.id ?? null)
      setSession(nextSession)
      setError(nextError)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      receivedEvent = true
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      update(nextSession)
    })

    // A delayed startup response must not overwrite a newer login/logout event.
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!receivedEvent) update(data.session, sessionError ? authErrorMessage(sessionError) : null)
    }).catch((failure: unknown) => {
      if (!receivedEvent) update(null, authErrorMessage(failure))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signInUser(email: string, password: string): Promise<AuthResult> {
    if (!supabase) {
      const cleanEmail = email.trim().toLowerCase()
      const names = readJson<Record<string, string>>(DEMO_NAMES_KEY, {})
      const next = startDemoSession({ email: cleanEmail, name: names[cleanEmail] || nameFromEmail(cleanEmail) })
      return { success: true, data: { session: next, user: next?.user ?? null } }
    }
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) return { success: false, error: authErrorMessage(signInError) }
      return { success: true, data }
    } catch (failure) {
      return { success: false, error: authErrorMessage(failure) }
    }
  }

  async function signUpUser(email: string, password: string, name: string): Promise<AuthResult> {
    if (!supabase) {
      const cleanEmail = email.trim().toLowerCase()
      writeJson(DEMO_NAMES_KEY, { ...readJson<Record<string, string>>(DEMO_NAMES_KEY, {}), [cleanEmail]: name.trim() })
      const next = startDemoSession({ email: cleanEmail, name: name.trim() })
      return { success: true, data: { session: next, user: next?.user ?? null } }
    }
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
      })
      if (signUpError) return { success: false, error: authErrorMessage(signUpError) }
      return { success: true, data }
    } catch (failure) {
      return { success: false, error: authErrorMessage(failure) }
    }
  }

  async function signOutUser() {
    if (!supabase) {
      startDemoSession(null)
      return { success: true }
    }
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) return { success: false, error: authErrorMessage(signOutError) }
      return { success: true }
    } catch (failure) {
      return { success: false, error: authErrorMessage(failure) }
    }
  }

  async function sendPasswordReset(email: string) {
    if (!supabase) return { success: false, error: DEMO_PASSWORD_ERROR }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) return { success: false, error: authErrorMessage(resetError) }
      return { success: true }
    } catch (failure) {
      return { success: false, error: authErrorMessage(failure) }
    }
  }

  async function updatePassword(password: string) {
    if (!supabase) return { success: false, error: DEMO_PASSWORD_ERROR }
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) return { success: false, error: authErrorMessage(updateError) }
      setRecovering(false)
      return { success: true }
    } catch (failure) {
      return { success: false, error: authErrorMessage(failure) }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session, error, configured: !!supabase, recovering,
        signInUser, signUpUser, signOutUser, sendPasswordReset, updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// The tutorial keeps the provider and its consumer hook together.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthContextProvider')
  return context
}

