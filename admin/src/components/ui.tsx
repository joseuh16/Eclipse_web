import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, X } from 'lucide-react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEscape, useLockBody } from '../lib/hooks'
import { cn } from '../lib/utils'
import type { OrderStatus } from '../types'

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-white/20 border-t-white',
        className,
      )}
      style={{ width: size, height: size }}
    />
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/50">
        <Icon size={24} />
      </span>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-white/45">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  // Evita volver a suscribir Escape en cada render (los onClose suelen ser inline).
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  const handleEscape = useCallback(() => closeRef.current(), [])

  useLockBody(open)
  useEscape(open, handleEscape)

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  // Portal al body: si el modal queda dentro de un contenedor con transform
  // (ej. animate-fade-up), `fixed` se posiciona respecto a ese padre y sale
  // de la pantalla al hacer scroll. Aquí siempre es respecto al viewport.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-[81] flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0b16] shadow-card animate-scale-in sm:rounded-3xl',
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-xs text-white/45">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="icon-btn shrink-0" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.07] bg-white/[0.02] px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner size={14} /> : <AlertTriangle size={15} />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-6 text-white/60">{description}</p>
    </Modal>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-200 disabled:opacity-40',
        checked
          ? 'border-primary/60 bg-primary/80'
          : 'border-white/15 bg-white/[0.06]',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  )
}

const statusStyles: Record<OrderStatus, string> = {
  Pending: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  Verified: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  Cancelled: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
}

const statusLabels: Record<OrderStatus, string> = {
  Pending: 'Pendiente',
  Verified: 'Verificada',
  Cancelled: 'Cancelada',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn('badge', statusStyles[status])}>{statusLabels[status]}</span>
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'primary' | 'success' | 'danger' | 'warning'
}) {
  const tones = {
    neutral: 'border-white/[0.12] bg-white/[0.04] text-white/55',
    primary: 'border-primary/25 bg-primary/10 text-primary',
    success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    danger: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
    warning: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  }
  return <span className={cn('badge', tones[tone])}>{children}</span>
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton h-11 w-full" />
      ))}
    </div>
  )
}
