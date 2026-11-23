import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { useStore } from './StoreContext'
import {
  ensureCustomerProfile,
  getCustomerProfile,
  hasAccount,
  logoutCustomer,
  registerCustomer,
  signInCustomer,
  watchCustomerAuth,
  type RegisterCustomerInput,
} from '../lib/customerAuth'
import type { CustomerProfile } from '../types'

interface CustomerAuthContextValue {
  user: User | null
  profile: CustomerProfile | null
  loading: boolean
  isStudent: boolean
  studentApproved: boolean
  /** Porcentaje que realmente aplica: solo si inició sesión y está aprobado. */
  studentDiscountPercent: number
  hasAccount: (email: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<CustomerProfile>
  register: (input: RegisterCustomerInput) => Promise<CustomerProfile>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const { settings } = useStore()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (current: User | null) => {
    if (!current) {
      setProfile(null)
      return
    }
    try {
      const existing = await getCustomerProfile(current.uid)
      setProfile(existing ?? (await ensureCustomerProfile(current)))
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    return watchCustomerAuth((current) => {
      setUser(current)
      setLoading(true)
      void loadProfile(current).finally(() => setLoading(false))
    })
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await signInCustomer(email, password)
    setProfile(next)
    return next
  }, [])

  const register = useCallback(async (input: RegisterCustomerInput) => {
    const next = await registerCustomer(input)
    setProfile(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    await logoutCustomer()
    setProfile(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadProfile(user)
  }, [loadProfile, user])

  const isStudent = Boolean(profile?.isStudent)
  const studentApproved = Boolean(profile?.studentApproved)
  const studentDiscountPercent =
    isStudent && studentApproved ? Math.max(0, Math.min(100, Number(settings.studentDiscountPercent ?? 0))) : 0

  const value = useMemo<CustomerAuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isStudent,
      studentApproved,
      studentDiscountPercent,
      hasAccount,
      signIn,
      register,
      logout,
      refresh,
    }),
    [user, profile, loading, isStudent, studentApproved, studentDiscountPercent, signIn, register, logout, refresh],
  )

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (!context) {
    throw new Error('useCustomerAuth debe usarse dentro de CustomerAuthProvider')
  }
  return context
}
