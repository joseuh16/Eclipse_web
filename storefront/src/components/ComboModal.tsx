import { lazy, Suspense } from 'react'
import { Layers3, Loader2, X } from 'lucide-react'
import { useEscape, useLockBody } from '../lib/hooks'

const ComboBuilder = lazy(() =>
  import('./ComboBuilder').then((module) => ({ default: module.ComboBuilder })),
)

interface ComboModalProps {
  open: boolean
  onClose: () => void
}

export function ComboModal({ open, onClose }: ComboModalProps) {
  useLockBody(open)
  useEscape(open, onClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[72] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-md animate-fade-in"
        aria-label="Cerrar constructor de combos"
      />
      <div className="relative flex max-h-[94vh] w-full max-w-6xl animate-scale-in flex-col overflow-hidden rounded-t-3xl border border-white/[0.12] bg-[#0a0a14] shadow-[0_30px_100px_-30px_rgba(0,0,0,.95)] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-accent">
              <Layers3 size={18} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-white">Crea tu combo</h2>
              <p className="mt-0.5 text-[10px] text-white/35">
                Elige 2 a 8 perfiles y mira cuánto ahorras en tiempo real.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-white/45">
                <Loader2 size={16} className="animate-spin" /> Preparando el constructor…
              </div>
            }
          >
            <ComboBuilder compact onAdded={onClose} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
