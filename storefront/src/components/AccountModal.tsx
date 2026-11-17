import { useState } from 'react'
import { Lock, Mail, User, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useLockBody } from '../lib/hooks'
import { cn } from '../lib/utils'

interface AccountModalProps {
  open: boolean
  onClose: () => void
}

const STORAGE_KEY = 'eclipse_account_v1'

interface StoredAccount {
  name: string
  contact: string
  createdAt: string
}

function readAccount(): StoredAccount | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredAccount
  } catch {
    return null
  }
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  const { toast } = useToast()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [account, setAccount] = useState<StoredAccount | null>(() => readAccount())

  useLockBody(open)

  if (!open) return null

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 3 || contact.trim().length < 5 || password.length < 4) {
      toast('Completa todos los campos correctamente.', 'error')
      return
    }
    const next: StoredAccount = { name: name.trim(), contact: contact.trim(), createdAt: new Date().toISOString() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setAccount(next)
    toast('Cuenta creada correctamente. ¡Bienvenido!', 'success')
    setName('')
    setContact('')
    setPassword('')
  }

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault()
    const stored = readAccount()
    if (!stored) {
      toast('No hay una cuenta registrada. Crea una primero.', 'error')
      return
    }
    if (contact.trim() !== stored.contact) {
      toast('Usuario o contraseña incorrectos.', 'error')
      return
    }
    setAccount(stored)
    toast(`Bienvenido de nuevo, ${stored.name}.`, 'success')
    setContact('')
    setPassword('')
  }

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setAccount(null)
    toast('Sesión cerrada.', 'success')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-md animate-fade-in"
        aria-label="Cerrar cuenta"
      />
      <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-3xl border border-white/[0.12] bg-[#0a0a14] shadow-[0_30px_100px_-30px_rgba(0,0,0,.95)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-accent">
              <User size={18} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-white">Mi cuenta</h2>
              <p className="mt-0.5 text-[10px] text-white/35">Accede o crea tu cuenta Eclipse</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {account ? (
          <div className="p-5">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
              <p className="text-sm font-semibold text-white">Hola, {account.name}</p>
              <p className="mt-1 text-[11px] text-white/55">{account.contact}</p>
              <p className="mt-3 text-[10px] text-white/35">
                Cuenta creada el {new Date(account.createdAt).toLocaleDateString('es-MX')}.
              </p>
            </div>
            <p className="mt-4 text-xs leading-6 text-white/55">
              Desde <a href="#/cuenta" className="text-accent underline-offset-2 hover:underline" onClick={onClose}>Mi cuenta</a> puedes
              consultar tus pedidos, estado y fechas de pago. Si necesitas detalles de tus servicios, contáctanos por WhatsApp con tu número de orden.
            </p>
            <button type="button" onClick={handleLogout} className="btn-secondary mt-5 w-full">
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={cn(
                  'flex-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition',
                  mode === 'login' ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white',
                )}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={cn(
                  'flex-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition',
                  mode === 'register' ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white',
                )}
              >
                Crear cuenta
              </button>
            </div>

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="mt-5 space-y-3">
              {mode === 'register' && (
                <label className="block">
                  <span className="field-label">Nombre</span>
                  <div className="relative">
                    <User size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Tu nombre"
                      className="field h-11 !rounded-xl !py-0 pl-10 text-xs"
                    />
                  </div>
                </label>
              )}
              <label className="block">
                <span className="field-label">{mode === 'login' ? 'Usuario o correo' : 'Correo o WhatsApp'}</span>
                <div className="relative">
                  <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                  <input
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="field h-11 !rounded-xl !py-0 pl-10 text-xs"
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
              </label>
              <button type="submit" className="btn-primary mt-2 w-full">
                {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            </form>
            <p className="mt-4 text-[9px] leading-5 text-white/30">
              Tu cuenta se guarda en este navegador. El panel administrativo es independiente.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
