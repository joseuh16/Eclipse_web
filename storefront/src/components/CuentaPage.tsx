import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  KeyRound,
  LogOut,
  MessageCircle,
  Package,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { api } from '../lib/api'
import { openPaymentProof } from '../lib/events'
import type { RtdbCustomerAsset } from '../lib/rtdb'
import { formatCurrency, formatDate } from '../lib/pricing'
import { clearClientOrders, readClientOrders, type StoredOrder } from '../lib/clientOrders'
import { PAYMENT_METHODS, getPaymentDetails } from './PaymentDetails'
import { CopyButton } from './CopyButton'

function statusLabel(status: StoredOrder['status']) {
  if (status === 'Verified') return 'Pago verificado'
  if (status === 'Cancelled') return 'Cancelado'
  return 'Pendiente de pago'
}

function statusClass(status: StoredOrder['status']) {
  if (status === 'Verified') return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
  if (status === 'Cancelled') return 'border-rose-400/25 bg-rose-400/10 text-rose-200'
  return 'border-amber-400/25 bg-amber-400/10 text-amber-100'
}

function dueInfo(order: StoredOrder) {
  const due = new Date(order.paymentDueAt).getTime()
  const now = Date.now()
  const diff = due - now
  if (order.status === 'Verified') return { label: 'Pago confirmado', tone: 'text-emerald-300' }
  if (order.status === 'Cancelled') return { label: 'Pedido cancelado', tone: 'text-rose-300' }
  if (Number.isNaN(due)) return { label: 'Fecha de pago por confirmar', tone: 'text-white/50' }
  if (diff < 0) return { label: 'Pago vencido: envía tu comprobante', tone: 'text-rose-300' }
  const hours = Math.ceil(diff / (1000 * 60 * 60))
  if (hours <= 6) return { label: `Vence en ${hours} h`, tone: 'text-amber-300' }
  return { label: `Vence ${formatDate(order.paymentDueAt)}`, tone: 'text-amber-200/90' }
}

export function CuentaPage() {
  const { settings } = useStore()
  const { user, profile, studentDiscountPercent, logout } = useCustomerAuth()
  const [orders, setOrders] = useState<StoredOrder[]>([])
  const [assets, setAssets] = useState<RtdbCustomerAsset[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const ownerKey = user?.uid ?? user?.email ?? undefined

  const refresh = () => {
    const next = readClientOrders(ownerKey)
    setOrders(next)
    setSelectedId((current) => (current && next.some((o) => o.orderId === current) ? current : next[0]?.orderId ?? null))
  }

  useEffect(() => {
    refresh()
    if (user) {
      api
        .getMisCodigos(user.uid, user.email || '')
        .then(setAssets)
        .catch(() => setAssets([]))
    } else {
      setAssets([])
    }
  }, [ownerKey, user])

  const selected = useMemo(
    () => orders.find((o) => o.orderId === selectedId) ?? orders[0] ?? null,
    [orders, selectedId],
  )

  const pending = orders.filter((o) => o.status === 'Pending').length

  return (
    <div className="min-h-screen pb-16">
      <section className="page-shell scroll-mt-28 pt-16 sm:pt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href="#/" className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/50 transition hover:text-white">
            ← Volver al inicio
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refresh} className="btn-secondary !py-2.5 !text-xs">
              <RefreshCw size={14} />
              Actualizar
            </button>
            {orders.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearClientOrders(ownerKey)
                  refresh()
                }}
                className="btn-secondary !py-2.5 !text-xs"
              >
                Limpiar historial
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(135deg,rgba(139,92,246,.18),rgba(34,211,238,.08)_45%,rgba(255,255,255,.02))] p-6 sm:p-8">
          <span className="eyebrow">
            <Wallet size={13} />
            Mi cuenta · Portal del cliente
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {user ? `¡Hola, ${profile?.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'cliente'}!` : 'Tus pedidos y fechas de pago'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
            Consulta el estado de tus compras, el método de pago, el monto y la fecha límite para enviar tu comprobante.
            Este historial es solo de tu cuenta y aparece aquí automáticamente.
          </p>

          {user && profile ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-accent">
                <GraduationCap size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {profile.displayName || user.email}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-white/45">{profile.email || user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void logout().then(() => {
                    window.location.hash = '#/'
                  })
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-medium text-white/60 transition hover:border-white/25 hover:text-white"
              >
                <LogOut size={12} />
                Cerrar sesión
              </button>
              {profile.isStudent ? (
                <span
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold ${
                    profile.studentApproved
                      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                      : 'border-amber-400/25 bg-amber-400/10 text-amber-100'
                  }`}
                >
                  {profile.studentApproved
                    ? `Estudiante · -${studentDiscountPercent}%`
                    : 'Estudiante en revisión'}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-white/45">
                  Sin descuento de estudiante
                </span>
              )}
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.07] px-4 py-3 text-[11px] text-white/60">
              <GraduationCap size={14} className="shrink-0 text-accent" />
              Inicia sesión desde <span className="font-semibold text-white">Mi cuenta</span> para activar tu descuento de estudiante.
            </div>
          )}

          {user ? (
            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold text-white/80">
                <KeyRound size={14} className="text-accent" />
                Mis códigos y cuentas
              </p>
              {assets.length === 0 ? (
                <p className="mt-2 text-[10px] leading-5 text-white/40">
                  Todavía no hay códigos asignados a tu correo. Cuando se apruebe tu pago aparecerán aquí.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {assets.map((asset) => (
                    <li
                      key={`${asset.node}-${asset.key}`}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                    >
                      <p className="truncate text-[10px] font-semibold text-white/80">
                        {asset.plataforma || asset.titulo}
                      </p>
                      {asset.valor ? (
                        <p className="mt-1 break-all font-mono text-[11px] text-accent">{asset.valor}</p>
                      ) : null}
                      {asset.vigenciaHasta ? (
                        <p className="mt-1 text-[9px] text-white/35">Vence: {asset.vigenciaHasta}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Pedidos</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/60">Pendientes de pago</p>
              <p className="mt-2 font-display text-2xl font-semibold text-amber-100">{pending}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Soporte</p>
              <p className="mt-2 text-sm font-medium text-white/85">{settings.whatsAppNumber || `WhatsApp ${settings.companyName}`}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell mt-8">
        {orders.length === 0 ? (
          <div className="panel p-10 text-center">
            <ShoppingBag size={34} className="mx-auto text-white/20" />
            <h2 className="mt-4 font-display text-xl font-semibold text-white">Aún no hay pedidos en este dispositivo</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-white/45">
              Cuando completes una compra, aquí podrás ver tu número de orden, fecha de pago, método, monto y estado.
              También puedes escribirnos por WhatsApp con tu comprobante para validar tu pago.
            </p>
            <a href="#catalogo" className="btn-primary mt-6 inline-flex">
              <Package size={15} />
              Ver catálogo
            </a>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr]">
            <div className="space-y-3">
              {orders.map((order) => {
                const due = dueInfo(order)
                return (
                  <button
                    key={order.orderId}
                    type="button"
                    onClick={() => setSelectedId(order.orderId)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected?.orderId === order.orderId
                        ? 'border-primary/30 bg-primary/[0.08]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-white/45">{order.orderNumber}</p>
                        <p className="mt-1 text-sm font-medium text-white/90">{order.customerName}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={12} />
                        {formatDate(order.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard size={12} />
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <p className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium ${due.tone}`}>
                      <CalendarClock size={12} />
                      {due.label}
                    </p>
                  </button>
                )
              })}
            </div>

            {selected ? (
              <article className="panel overflow-hidden">
                <div className="border-b border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Detalle del pedido</p>
                      <h2 className="mt-2 font-mono text-xl font-bold text-white">{selected.orderNumber}</h2>
                      <p className="mt-1 text-sm text-white/45">
                        Creado {formatDate(selected.createdAt)} · {selected.items.length} artículo(s)
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(selected.status)}`}>
                        {statusLabel(selected.status)}
                      </span>
                      <CopyButton value={selected.orderNumber} label="Número de orden" />
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Fecha de pago</p>
                      <p className={`mt-2 text-sm font-semibold ${dueInfo(selected).tone}`}>
                        {dueInfo(selected).label}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Límite: {formatDate(selected.paymentDueAt)}
                      </p>
                      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-white/40">
                        <CalendarClock size={12} />
                        Estado: {selected.status === 'Pending' ? 'En espera de comprobante' : selected.status === 'Verified' ? `Validado por ${settings.companyName}` : 'Sin vigencia'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Pago</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {PAYMENT_METHODS.find((m) => m.value === selected.paymentMethod)?.label ?? selected.paymentMethod}
                      </p>
                      <p className="mt-1 text-xs text-white/45">Total: {formatCurrency(selected.totalAmount)}</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-accent/90">
                        {getPaymentDetails(selected.paymentMethod, selected.settings || settings).value}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                      Artículos y servicio
                    </p>
                    <ul className="space-y-2.5">
                      {selected.items.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/15 p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white/85">{item.name}</p>
                            <p className="mt-0.5 text-[11px] text-white/35">
                              {item.quantity} × {item.durationMonths} mes(es)
                              {item.comboDiscountPercent > 0 ? ` · combo -${item.comboDiscountPercent}%` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-white">{formatCurrency(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-1.5 border-t border-white/[0.07] pt-3 text-sm">
                      <div className="flex justify-between text-white/45">
                        <span>Subtotal</span>
                        <span>{formatCurrency(selected.subtotal)}</span>
                      </div>
                      {selected.discountAmount > 0 ? (
                        <div className="flex justify-between text-emerald-300/80">
                          <span>Descuento</span>
                          <span>-{formatCurrency(selected.discountAmount)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between font-semibold text-white">
                        <span>Total</span>
                        <span>{formatCurrency(selected.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a
                      href={selected.whatsAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary flex-1 justify-center"
                    >
                      <MessageCircle size={15} />
                      Enviar comprobante por WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        openPaymentProof({
                          orderNumber: selected.orderNumber,
                          total: selected.totalAmount,
                          whatsAppNumber: settings.whatsAppNumber,
                          companyName: settings.companyName,
                          customerEmail: user?.email ?? undefined,
                        })
                      }
                      className="btn-secondary flex-1 justify-center"
                    >
                      <FileText size={15} />
                      Adjuntar PDF y mensaje
                    </button>
                    <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[11px] leading-5 text-white/45">
                      <span className="inline-flex items-center gap-1.5 font-medium text-white/70">
                        <Receipt size={13} />
                        Nota
                      </span>
                      <p className="mt-1">
                        Guarda tu número de orden y envía el comprobante antes de la fecha límite para activar tu servicio.
                      </p>
                    </div>
                  </div>

                  {selected.status === 'Pending' ? (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[11px] leading-5 text-amber-100/80">
                      <Clock3 size={14} className="mt-0.5 shrink-0" />
                      Tu pago aparece como pendiente hasta que el equipo de {settings.companyName} valide tu comprobante.
                    </div>
                  ) : selected.status === 'Verified' ? (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-[11px] leading-5 text-emerald-100/80">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                      Pago verificado. Si necesitas ver detalles de tu cuenta/servicio, contáctanos por WhatsApp con tu número de orden.
                    </div>
                  ) : null}
                </div>
              </article>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}
