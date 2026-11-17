import { useEffect, useState, type ReactNode } from 'react'
import { Logo } from '../../components/Logo'
import { Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { LoginPage } from '../../pages/LoginPage'

function AuthSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <Logo />
      <div className="flex items-center gap-2 text-xs text-white/35">
        <Spinner size={14} />
        Verificando sesión…
      </div>
    </div>
  )
}

function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, '').trim()
}

/**
 * Guard de rutas del panel.
 * - Sin sesión: solo se renderiza el módulo de Login (aislado del panel).
 * - Con sesión: se renderiza el panel protegido.
 * La sesión la provee Firebase Auth mediante `useAuth()`.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth()
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (booting) return
    if (!user && route !== 'login') {
      window.location.replace('#/login')
      return
    }
    if (user && route === 'login') {
      window.location.replace('#/dashboard')
    }
  }, [booting, user, route])

  if (booting) return <AuthSplash />
  if (!user) return <LoginPage />
  return <>{children}</>
}
