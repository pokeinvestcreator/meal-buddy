import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password, inviteCode) {
    // Validate invite code first
    const { data: code } = await supabase
      .from('invite_codes')
      .select('code, is_active, used_by')
      .eq('code', inviteCode.toUpperCase().trim())
      .single()

    if (!code || !code.is_active || code.used_by) {
      throw new Error('Invalid or already used invite code')
    }

    // Create account
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Mark invite code as used
    await supabase.rpc('use_invite_code', { p_code: inviteCode.toUpperCase().trim() })

    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
