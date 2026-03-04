import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserRole, AuthState } from '@/types/auth'
import { Session } from '@supabase/supabase-js'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  })
  const [loading, setLoading] = useState(true)

  // ================================
  // INIT AUTH SESSION
  // ================================
  useEffect(() => {
    async function initAuth() {
      console.log('[authContext] Initializing auth...')

      try {
        // ✅ CRITICAL: Get existing session from storage
        // This prevents logout on page reload
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession()

        if (sessionError) {
          console.error('[authContext] Error getting session:', sessionError.message)
          setLoading(false)
          return
        }

        if (sessionData.session) {
          console.log('[authContext] Session restored from storage')
          setSession(sessionData.session)
        } else {
          console.log('[authContext] No existing session')
          setLoading(false)
        }
      } catch (error) {
        console.error('[authContext] Init error:', error)
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  // ================================
  // LISTEN TO AUTH STATE CHANGES
  // ✅ CRITICAL: This enables auto-refresh
  // ================================
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[authContext] Auth state changed:', {
          event,
          hasSession: !!newSession,
        })

        setSession(newSession)

        // If signed out, clear auth state
        if (event === 'SIGNED_OUT') {
          setAuthState({ user: null, isAuthenticated: false })
          setLoading(false)
          return
        }

        // Flag for loading profile next
        if (newSession) {
          setLoading(true)
        }
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // ================================
  // LOAD PROFILE FROM DB
  // ================================
  useEffect(() => {
    if (!session?.user) {
      setAuthState({ user: null, isAuthenticated: false })
      setLoading(false)
      return
    }

    async function loadProfile() {
      console.log('[authContext] Loading profile for user:', session.user.id)
      setLoading(true)

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('[authContext] Failed to load profile:', error.message)
          setAuthState({ user: null, isAuthenticated: false })
          return
        }

        if (!profile) {
          console.error('[authContext] Profile not found for user:', session.user.id)
          setAuthState({ user: null, isAuthenticated: false })
          return
        }

        console.log('[authContext] Profile loaded:', {
          id: profile.id,
          role: profile.role,
        })

        setAuthState({
          user: profile,
          isAuthenticated: true,
        })
        // Try to unlock audio on first user interaction so alarms can play
        try {
          const { enableAudioUnlock } = await import('@/services/alarmService')
          enableAudioUnlock()
        } catch (e) {
          console.warn('[authContext] enableAudioUnlock failed:', e)
        }
      } catch (error) {
        console.error('[authContext] Profile load error:', error)
        setAuthState({ user: null, isAuthenticated: false })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [session])

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('[authContext] Login attempt:', email)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('[authContext] Login error:', error.message)
        return false
      }

      console.log('[authContext] Login successful')
      return true
    } catch (error) {
      console.error('[authContext] Login exception:', error)
      return false
    }
  }

  const logout = async () => {
    console.log('[authContext] Logout...')

    try {
      // ✅ CRITICAL: Cleanup before logout
      // Import from services to avoid circular deps
      const { cleanupTracking } = await import('@/services/trackingService')
      const { cleanupAlarm } = await import('@/services/alarmService')

      cleanupTracking()
      cleanupAlarm()

      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[authContext] Logout error:', error.message)
      }

      setAuthState({ user: null, isAuthenticated: false })
      setSession(null)

      console.log('[authContext] Logout complete')
    } catch (error) {
      console.error('[authContext] Logout exception:', error)
      // Force clear state even if error
      setAuthState({ user: null, isAuthenticated: false })
      setSession(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{ ...authState, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
