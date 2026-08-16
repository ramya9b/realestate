import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { UserRole } from './schema'

// Build sheet P1-25.
//
// Email and password for now. Phone OTP suits this audience far better, but
// SMS to Indian numbers needs DLT registration first — swapping later is a
// Supabase setting and a different form, not a schema change.

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // The role lives in profiles, created by the on_auth_user_created trigger.
  useEffect(() => {
    if (!session?.user) { setRole(null); return }
    let cancelled = false
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setRole((data?.role as UserRole) ?? null) })
    return () => { cancelled = true }
  }, [session?.user?.id])

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider
      value={{ user: session?.user ?? null, session, role, loading, signUp, signIn, signOut }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export const isStaff = (role: UserRole | null) => role === 'admin' || role === 'verifier'
