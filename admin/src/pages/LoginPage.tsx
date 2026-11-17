import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { FormError, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { requestPasswordReset } from '../lib/firebaseAuth'
import { cn } from '../lib/utils'

export function LoginPage() {
  const { login, signingIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await login(username, password, remember)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos iniciar sesión. Intenta de nuevo.')
    }
  }

  const handleReset = async () => {
    setError(null)
    setResetSent(false)
    if (!username.includes('@')) {
      setError('Escribe tu correo completo para enviarte el enlace de recuperación.')
      return
    }
    try {
      await requestPasswordReset(username)
      setResetSent(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos enviar el correo de recuperación.')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-secondary/15 blur-[120px]"
      />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a14]/85 shadow-card backdrop-blur-2xl lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.07] p-10 lg:flex">
          <div
            aria-hidden
            className="absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(38rem 26rem at 15% 0%, rgb(var(--primary-rgb) / .35), transparent 60%), radial-gradient(28rem 22rem at 85% 100%, rgb(var(--secondary-rgb) / .25), transparent 65%)',
            }}
          />
          <div className="relative">
            <Logo />
          </div>
          <div className="relative">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              <Sparkles size={13} className="text-accent" />
              Private workspace
            </span>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              Controla tu tienda,
              <br />
              <span className="bg-gradient-to-r from-white via-secondary to-primary bg-clip-text text-transparent">
                sin fricción.
              </span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/50">
              Ventas, catálogo, temas de temporada, cupones y pagos en un solo panel. Cada cambio se
              refleja al instante en la tienda pública.
            </p>
          </div>
          <div className="relative grid grid-cols-2 gap-3">
            {[
              { label: 'Órdenes', value: 'Tiempo real' },
              { label: 'Temas', value: '5 presets' },
              { label: 'Catálogo', value: 'CRUD completo' },
              { label: 'Seguridad', value: 'Firebase Auth' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/80">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <LockKeyhole size={22} />
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-white">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Acceso exclusivo para administradores de Eclipse Tech.
          </p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <FormError message={error} />

            <div>
              <label htmlFor="username" className="field-label">
                Correo o usuario
              </label>
              <div className="relative">
                <UserRound
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  id="username"
                  name="username"
                  className="field pl-10"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin o tu@correo.com"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Contraseña
              </label>
              <div className="relative">
                <LockKeyhole
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="field pl-10 pr-11"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••"
                  required
                  minLength={4}
                  maxLength={200}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-white/50">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/[0.06] accent-primary"
                />
                Mantener la sesión en este dispositivo
              </label>
              <button
                type="button"
                onClick={() => void handleReset()}
                className="text-[11px] font-medium text-white/40 underline-offset-4 transition hover:text-white hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {resetSent ? (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-[11px] leading-5 text-emerald-100/80">
                Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja y spam.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={signingIn || !username.trim() || !password}
              className={cn('btn-primary w-full py-3.5', signingIn && 'cursor-wait')}
            >
              {signingIn ? (
                <>
                  <Spinner size={15} />
                  Verificando…
                </>
              ) : (
                <>
                  Entrar al panel
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 text-[11px] leading-5 text-white/35">
            <Mail size={15} className="mt-0.5 shrink-0 text-emerald-300/70" />
            <p>
              Autenticación con <strong className="font-semibold text-white/55">Firebase Auth</strong>. Crea los usuarios
              administradores en Firebase Console → Authentication → Users. Si escribes un usuario corto (ej.{' '}
              <code>admin</code>) se usará el correo interno del dominio configurado.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
