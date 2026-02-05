import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const ROLE_TABLE = 'profiles'
const ROLE_COLUMN = 'role'

async function fetchUserRole(userId) {
  if (!userId) return { role: null, error: 'Missing user id' }
  try {
    const { data, error } = await supabase
      .from(ROLE_TABLE)
      .select(ROLE_COLUMN)
      .eq('id', userId)
      .single()

    if (error) {
      return { role: null, error: error.message }
    }

    return { role: data?.[ROLE_COLUMN] ?? null, error: null }
  } catch (err) {
    return { role: null, error: err?.message ?? 'Role fetch failed' }
  }
}

function roleWithTimeout(userId, timeoutMs = 8000) {
  return Promise.race([
    fetchUserRole(userId),
    new Promise((resolve) =>
      setTimeout(
        () => resolve({ role: null, error: 'Role fetch timeout' }),
        timeoutMs,
      ),
    ),
  ])
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [roleError, setRoleError] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return
      setSession(data.session ?? null)
      setSessionLoading(false)
      if (data.session?.user?.id) {
        setRoleLoading(true)
        const { role: fetchedRole, error } = await roleWithTimeout(
          data.session.user.id,
        )
        if (isMounted) {
          setRole(fetchedRole)
          setRoleError(error)
          setRoleLoading(false)
        }
      } else {
        setRole(null)
        setRoleError(null)
        setRoleLoading(false)
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user?.id) {
        setRoleLoading(true)
        const { role: fetchedRole, error } = await roleWithTimeout(
          nextSession.user.id,
        )
        setRole(fetchedRole)
        setRoleError(error)
        setRoleLoading(false)
      } else {
        setRole(null)
        setRoleError(null)
        setRoleLoading(false)
      }
      setSessionLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      roleError,
      sessionLoading,
      roleLoading,
      signInWithPassword: (payload) => supabase.auth.signInWithPassword(payload),
      signUpWithPassword: (payload) => supabase.auth.signUp(payload),
      signOut: () => supabase.auth.signOut(),
      refreshRole: async () => {
        const userId = session?.user?.id
        setRoleLoading(true)
        const { role: fetchedRole, error } = await roleWithTimeout(userId)
        setRole(fetchedRole)
        setRoleError(error)
        setRoleLoading(false)
        return fetchedRole
      },
    }),
    [session, role, roleError, sessionLoading, roleLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
