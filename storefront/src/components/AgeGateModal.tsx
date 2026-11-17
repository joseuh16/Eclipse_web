import { useState } from 'react'
import { CalendarDays, LockKeyhole, ShieldAlert, X } from 'lucide-react'
import { useEscape } from '../lib/hooks'

interface AgeGateModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function AgeGateModal({ open, onClose, onConfirm }: AgeGateModalProps) {
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState('')

  useEscape(open, onClose)

  if (!open) return null

  const limitDate = new Date()
  limitDate.setFullYear(limitDate.getFullYear() - 18)
  const maxDate = limitDate.toISOString().slice(0, 10)

  const verify = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!birthDate) {
      setError('Selecciona tu fecha de nacimiento.')
      return
    }

    const birth = new Date(`${birthDate}T00:00:00`)
    if (Number.isNaN(birth.getTime())) {
      setError('La fecha no es válida.')
      return
    }

    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    if (age < 18) {
      setError('Debes ser mayor de 18 años para acceder a esta categoría.')
      return
    }

    onConfirm()
    setBirthDate('')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
        aria-label="Cerrar verificación de edad"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-400/20 bg-[#0b0b14] shadow-card animate-scale-in"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-500/20 blur-[70px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-[70px]" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/50 transition hover:text-white"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>

        <div className="relative p-6 sm:p-7">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-red-400/25 bg-red-500/10 text-red-300">
            <ShieldAlert size={22} />
          </span>

          <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.24em] text-red-300/70">
            Contenido restringido
          </p>
          <h2
            id="age-gate-title"
            className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-white"
          >
            ¿Eres mayor de 18 años?
          </h2>
          <p className="mt-2 text-[11px] leading-6 text-white/45">
            Esta sección contiene licencias para adultos. Verifica tu edad para continuar. No mostramos
            contenido explícito en el catálogo.
          </p>

          <form onSubmit={verify} className="mt-5">
            <label className="block">
              <span className="field-label">Fecha de nacimiento</span>
              <div className="relative">
                <CalendarDays
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) => {
                    setBirthDate(event.target.value)
                    setError('')
                  }}
                  max={maxDate}
                  className="field pl-11 [color-scheme:dark]"
                  aria-label="Fecha de nacimiento"
                  required
                />
              </div>
            </label>

            {error && (
              <p className="mt-2 rounded-lg border border-rose-400/15 bg-rose-400/10 px-3 py-2 text-[10px] leading-5 text-rose-200">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary mt-4 w-full">
              Verificar y entrar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-full px-4 py-2.5 text-[10px] font-medium text-white/35 transition hover:text-white"
            >
              No soy mayor de edad, volver
            </button>
          </form>

          <div className="mt-4 flex items-start gap-2 border-t border-white/[0.08] pt-4">
            <LockKeyhole size={11} className="mt-0.5 shrink-0 text-white/25" />
            <p className="text-[8px] leading-4 text-white/25">
              Solo guardamos la verificación en esta sesión del navegador. No almacenamos tu fecha de
              nacimiento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
