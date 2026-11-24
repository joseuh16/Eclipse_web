import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BadgePercent,
  Check,
  GraduationCap,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Upload,
  User,
  X,
} from 'lucide-react'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { compressImageFile } from '../lib/images'
import { useLockBody } from '../lib/hooks'
import { friendlyAuthError, passwordErrors } from '../lib/customerAuth'

interface AccountModalProps {
  open: boolean
  onClose: () => void
}

type Step = 'email' | 'password' | 'register'

export function AccountModal({ open, onClose }: AccountModalProps) {
  const { toast } = useToast()
  const { settings } = useStore()
  const { user, profile, loading, hasAccount, signIn, register, logout } = useCustomerAuth()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [isStudent, setIsStudent] = useState(false)
  const [credential, setCredential] = useState('')
  const [credentialName, setCredentialName] = useState('')
  const [busy, setBusy] = useState(false)

  useLockBody(open)

  useEffect(() => {
    if (open) {
      setStep('email')
      setPassword('')
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const finish = (message: string) => {
    toast(message, 'success')
    setName('')
    setPassword('')
    setCredential('')
    setCredentialName('')
    setIsStudent(false)
    onClose()
  }

  const handleEmail = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast('Escribe un correo válido para continuar.', 'error')
      return
    }
    setBusy(true)
    try {
      const exists = await hasAccount(email)
      setStep(exists ? 'password' : 'register')
    } catch {
      // Firebase puede ocultar si el correo existe: mostramos el alta y el
      // mensaje de "ya tienes cuenta" aparece si el correo está registrado.
      setStep('register')
      toast('Completa tus datos. Si ya tienes cuenta, te pediremos la contraseña.', 'info')
    } finally {
      setBusy(false)
    }
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await signIn(email, password)
      finish(`¡Bienvenido de nuevo${profile?.displayName ? `, ${profile.displayName}` : ''}!`)
      window.location.hash = '#/cuenta'
    } catch (error) {
      toast(friendlyAuthError(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleCredential = async (file: File | null) => {
    if (!file) return
    try {
      setCredential(await compressImageFile(file))
      setCredentialName(file.name)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No pudimos leer la credencial.', 'error')
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    const problems = passwordErrors(password)
    if (problems.length > 0) {
      toast(`La contraseña necesita ${problems.join(', ')}.`, 'error')
      return
    }
    if (name.trim().length < 2) {
      toast('Escribe tu nombre completo.', 'error')
      return
    }
    if (isStudent && !credential) {
      toast('Adjunta tu credencial de estudiante para pedir el descuento.', 'error')
      return
    }
    setBusy(true)
    try {
      await register({ name, email, password, isStudent, credential: isStudent ? credential : undefined })
      finish('Cuenta creada correctamente. ¡Bienvenido!')
      window.location.hash = '#/cuenta'
    } catch (error) {
      const message = friendlyAuthError(error)
      toast(message, 'error')
      if (message.includes('ya tiene una cuenta')) setStep('password')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    setBusy(true)
    try {
      await logout()
      toast('Sesión cerrada.', 'success')
      setStep('email')
      setEmail('')
    } catch {
      toast('No pudimos cerrar la sesión.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-md animate-fade-in"
        aria-label="Cerrar cuenta"
      />
      <div className="relative max-h-[92vh] w-full max-w-md animate-scale-in overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#0a0a14] shadow-[0_30px_100px_-30px_rgba(0,0,0,.95)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-accent">
              <User size={18} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-white">Mi cuenta</h2>
              <p className="mt-0.5 text-[10px] text-white/35">Tu acceso a {settings.companyName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {user && profile ? (
          <div className="p-5">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
              <p className="text-sm font-semibold text-white">Hola, {profile.displayName || user.email}</p>
              <p className="mt-1 break-all text-[11px] text-white/55">{profile.email || user.email}</p>
              <p className="mt-3 text-[10px] text-white/35">
                Miembro desde {new Date(profile.createdAt).toLocaleDateString('es-MX')}.
              </p>
            </div>

            {profile.isStudent ? (
              <div
                className={`mt-3 rounded-2xl border p-4 ${
                  profile.studentApproved
                    ? 'border-emerald-400/25 bg-emerald-400/[0.06]'
                    : 'border-amber-400/25 bg-amber-400/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <GraduationCap size={15} />
                  {profile.studentApproved ? 'Estudiante verificado' : 'Credencial en revisión'}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-white/55">
                  {profile.studentApproved
                    ? `Tu descuento de ${settings.studentDiscountPercent}% se aplica automáticamente al pagar.`
                    : 'Tu credencial fue recibida. El panel la revisará y el descuento aparecerá cuando sea aprobado.'}
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <BadgePercent size={15} />
                  ¿Eres estudiante?
                </div>
                <p className="mt-2 text-[11px] leading-5 text-white/55">
                  Cierra sesión y vuelve a registrarte marcando la opción de estudiante para adjuntar tu credencial.
                </p>
              </div>
            )}

            <p className="mt-4 text-xs leading-6 text-white/55">
              Desde <a href="#/cuenta" className="text-accent underline-offset-2 hover:underline" onClick={onClose}>Mi cuenta</a> puedes
              consultar tus pedidos, estado y fechas de pago.
            </p>
            <button type="button" onClick={handleLogout} disabled={busy} className="btn-secondary mt-5 w-full">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-white/50">
                <Loader2 size={16} className="animate-spin" /> Restaurando tu sesión…
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.07] p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-accent">
                    <ArrowRight size={15} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-white">Empieza con tu correo</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/55">
                      Ejemplo: <span className="text-white/80">tucorreo@ejemplo.com</span>. Si ya tienes cuenta solo te pediremos
                      la contraseña; si no, te pediremos tus datos para crearla.
                    </p>
                  </div>
                </div>

                {step !== 'register' && (
                  <form onSubmit={handleEmail} className="mt-4">
                    <label className="block">
                      <span className="field-label">Correo electrónico</span>
                      <div className="relative">
                        <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="tucorreo@ejemplo.com"
                          className="field h-11 !rounded-xl !py-0 pl-10 text-xs"
                          autoFocus
                        />
                      </div>
                    </label>
                    <button type="submit" disabled={busy} className="btn-primary mt-3 w-full">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                      Continuar
                    </button>
                  </form>
                )}

                {step === 'password' && (
                  <form onSubmit={handleLogin} className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-white">Tu correo ya está registrado</p>
                      <button type="button" onClick={() => setStep('email')} className="text-[10px] text-accent hover:underline">
                        Usar otro correo
                      </button>
                    </div>
                    <label className="block">
                      <span className="field-label">Contraseña</span>
                      <div className="relative">
                        <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="••••••••"
                          className="field h-11 !rounded-xl !py-0 pl-10 text-xs"
                          autoFocus
                        />
                      </div>
                    </label>
                    <button type="submit" disabled={busy} className="btn-primary w-full">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      Entrar
                    </button>
                  </form>
                )}

                {step === 'register' && (
                  <form onSubmit={handleRegister} className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-white">Crea tu cuenta</p>
                      <button type="button" onClick={() => setStep('email')} className="text-[10px] text-accent hover:underline">
                        Cambiar correo
                      </button>
                    </div>
                    <p className="break-all text-[10px] text-white/40">{email}</p>

                    <label className="block">
                      <span className="field-label">Nombre completo</span>
                      <div className="relative">
                        <User size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Tu nombre"
                          className="field h-11 !rounded-xl !py-0 pl-10 text-xs"
                          autoFocus
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="field-label">Contraseña</span>
                      <div className="relative">
                        <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="••••••••"
                          className="field h-11 !rounded-xl !py-0 pl-10 text-xs"
                        />
                      </div>
                      <span className="mt-1.5 block text-[9px] leading-4 text-white/35">
                        Mínimo 6 caracteres, una mayúscula y un símbolo.
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <input
                        type="checkbox"
                        checked={isStudent}
                        onChange={(event) => setIsStudent(event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[color:var(--color-primary)]"
                      />
                      <span>
                        <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-white">
                          <GraduationCap size={14} /> Soy estudiante
                          {isStudent ? (
                            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                              Estudiante
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-white/45">
                          Adjunta una foto de tu credencial. Te avisaremos aquí cuando el panel la apruebe y el descuento se aplicará solo.
                        </span>
                      </span>
                    </label>

                    {isStudent && (
                      <label className="block">
                        <span className="field-label">Credencial de estudiante</span>
                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-2">
                          <Upload size={15} className="ml-1 shrink-0 text-white/40" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleCredential(event.target.files?.[0] ?? null)}
                            className="min-w-0 flex-1 text-[10px] text-white/50 file:mr-2 file:rounded-lg file:border-0 file:bg-primary/20 file:px-2 file:py-1.5 file:text-[10px] file:text-white"
                          />
                        </div>
                        {credential ? (
                          <span className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-300">
                            <Check size={12} /> {credentialName || 'Credencial lista'}
                          </span>
                        ) : null}
                      </label>
                    )}

                    <button type="submit" disabled={busy} className="btn-primary w-full">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                      Crear cuenta
                    </button>
                  </form>
                )}

                <p className="mt-4 text-[9px] leading-5 text-white/30">
                  Tu cuenta vive en Firebase y está separada del panel administrativo. Tus pedidos guardados en este dispositivo
                  se conservan.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
