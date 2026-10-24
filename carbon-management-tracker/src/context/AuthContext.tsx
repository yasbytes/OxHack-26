import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import supabase from '../supabase-client'
import { authErrorMessage } from '../auth-errors'
import { setLogUser } from '../logStore'

type AuthResult = {
  success: boolean
  data?: { session: Session | null; user: User | null }
  error?: string
}
type AuthContextValue = {
  session: Session | null | undefined
  error: string | null
  configured: boolean
  signInUser: (email: string, password: string) => Promise<AuthResult>
  signUpUser: (email: string, password: string, name: string) => Promise<AuthResult>
  signOutUser: () => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Same pattern as the course: one provider owns the session and all auth actions.
export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    let receivedEvent = false

    function update(nextSession: Session | null, nextError: string | null = null) {
      if (!active) return
      setLogUser(nextSession?.user.id ?? null)
      setSession(nextSession)
      setError(nextError)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedEvent = true
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
    if (!supabase) return { success: false, error: 'Account access is not available yet.' }
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) return { success: false, error: authErrorMessage(signInError) }
      return { success: true, data }
    } catch (failure) {
      return { success: false, error: authErrorMessage(failure) }
    }
  }

  async function signUpUser(email: string, password: string, name: string): Promise<AuthResult> {
    if (!supabase) return { success: false, error: 'Account access is not available yet.' }
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
    if (!supabase) return { success: false, error: 'Account access is not available yet.' }
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) return { success: false, error: authErrorMessage(signOutError) }
      return { success: true }
    } catch (failure) {
      return { success: false, error: authErrorMessage(failure) }
    }
  }

  return (
    <AuthContext.Provider value={{ session, error, configured: !!supabase, signInUser, signUpUser, signOutUser }}>
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

