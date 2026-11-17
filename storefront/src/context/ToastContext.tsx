import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const accents = {
  success: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  error: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
  info: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setItems((current) => [...current.slice(-3), { id, message, kind }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => {
          const Icon = icons[item.kind]
          return (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-2xl border border-white/10 bg-[#10101c]/95 p-4 shadow-card backdrop-blur-xl"
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${accents[item.kind]}`}>
                <Icon size={17} />
              </span>
              <p className="flex-1 pt-1.5 text-sm leading-5 text-white/85">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="mt-1 text-white/35 transition hover:text-white"
                aria-label="Cerrar notificación"
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider')
  }
  return context
}
