import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { UNAUTHORIZED_EVENT, setToken } from '../lib/api'
import {
  friendlyAuthError,
  resolveEmail,
  setAuthPersistence,
  signInAdmin,
  signOutAdmin,
  signUpAdmin,
  toAdminUser,
  watchAuth,
} from '../lib/firebaseAuth'
import type { AdminUser } from '../types'

interface AuthContextValue {
  user: AdminUser | null
  token: string | null
  booting: boolean
  signingIn: boolean
  login: (identifier: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const LOCAL_SESSION_KEY = 'eclipse_admin_local_session'

/**
 * Acceso local de contingencia. Se usa únicamente cuando Firebase Auth rechaza
 * las credenciales (por ejemplo, si el usuario aún no fue creado en Firebase).
 * En producción, crea los administradores en Firebase Auth y elimina esta lista.
 */
const CODED_ADMINS: Array<{ username: string; password: string; role: string }> = [
  { username: 'admin', password: 'Eclipse2026!', role: 'admin' },
  { username: 'jjaimej7@gmail.com', password: 'Eclipse2026!', role: 'admin' },
  { username: 'marisolestradaaguir@gmail.com', password: 'Eclipse2026!', role: 'admin' },
]

function isLocalToken(token: string | null): token is string {
  return Boolean(token && token.startsWith('local:'))
}

function readLocalSession(): AdminUser | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY) || window.sessionStorage.getItem(LOCAL_SESSION_KEY)
    return raw ? (JSON.parse(raw) as AdminUser) : null
  } catch {
    return null
  }
}

function persistLocalSession(user: AdminUser, remember: boolean) {
  const storage = remember ? window.localStorage : window.sessionStorage
  const other = remember ? window.sessionStorage : window.localStorage
  try {
    other.removeItem(LOCAL_SESSION_KEY)
    storage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user))
  } catch {
    // Storage puede no estar disponible (modo privado); la sesión sigue en memoria.
  }
}

function clearLocalSession() {
  try {
    window.localStorage.removeItem(LOCAL_SESSION_KEY)
    window.sessionStorage.removeItem(LOCAL_SESSION_KEY)
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  const clearSession = useCallback(() => {
    clearLocalSession()
    setToken(null)
    setTokenState(null)
    setUser(null)
  }, [])

  // Firebase Auth es la fuente de verdad de la sesión.
  useEffect(() => {
    let active = true

    const unsubscribe = watchAuth(async (firebaseUser) => {
      if (!active) return

      if (firebaseUser) {
        clearLocalSession()
        setUser(toAdminUser(firebaseUser))
        setTokenState(await firebaseUser.getIdToken().catch(() => null))
      } else {
        const fallback = readLocalSession()
        setUser(fallback)
        setTokenState(fallback ? `local:${fallback.username}` : null)
      }

      setBooting(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // Si la API responde 401, cerramos la sesión de Firebase (salvo sesión local).
  useEffect(() => {
    const onUnauthorized = () => {
      if (isLocalToken(token)) return
      void signOutAdmin().catch(() => undefined)
      clearSession()
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [token, clearSession])

  const login = useCallback(async (identifier: string, password: string, remember: boolean) => {
    setSigningIn(true)
    try {
      const normalized = identifier.trim()

      try {
        const firebaseUser = await signInAdmin(resolveEmail(normalized), password, remember)
        clearLocalSession()
        setUser(toAdminUser(firebaseUser))
        setTokenState(await firebaseUser.getIdToken().catch(() => null))
        return
      } catch (firebaseError) {
        // Contingencia: credenciales definidas en código si Firebase aún no tiene el usuario.
        const coded = CODED_ADMINS.find(
          (admin) =>
            (admin.username.toLowerCase() === normalized.toLowerCase() ||
              resolveEmail(admin.username) === resolveEmail(normalized)) &&
            admin.password === password,
        )

        if (!coded) {
          throw new Error(friendlyAuthError(firebaseError))
        }

        // Aprovisiona la cuenta en Firebase Auth (si el proveedor email/password está activo).
        try {
          const email = resolveEmail(coded.username)
          await setAuthPersistence(remember)
          const created = await signUpAdmin(email, password)
          clearLocalSession()
          setUser(toAdminUser(created))
          setTokenState(await created.getIdToken().catch(() => null))
          return
        } catch {
          // Si no se pudo crear, se usa la sesión local de contingencia.
        }

        const localUser: AdminUser = {
          id: 1,
          username: coded.username,
          role: coded.role,
          lastLoginAt: new Date().toISOString(),
        }
        persistLocalSession(localUser, remember)
        setUser(localUser)
        setTokenState(`local:${coded.username}`)
        void signOutAdmin().catch(() => undefined)
      }
    } finally {
      setSigningIn(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    void signOutAdmin().catch(() => undefined)
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, booting, signingIn, login, logout }),
    [user, token, booting, signingIn, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
