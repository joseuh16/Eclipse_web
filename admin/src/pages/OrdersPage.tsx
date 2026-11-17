import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  Search,
  ShoppingBag,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  EmptyState,
  FormError,
  Modal,
  PageHeader,
  SkeletonRows,
  Spinner,
  StatusBadge,
} from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { useDebounce } from '../lib/hooks'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type Order,
  type OrderStatus,
} from '../types'

const STATUS_TABS: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'Pending', label: 'Pendientes' },
  { key: 'Verified', label: 'Verificadas' },
  { key: 'Cancelled', label: 'Canceladas' },
]

const PAGE_SIZE = 12

export function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const debouncedSearch = useDebounce(search, 350)

  const [detail, setDetail] = useState<Order | null>(null)
  const [statusBusy, setStatusBusy] = useState<OrderStatus | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.orders.list({
        status: status === 'all' ? undefined : status,
        search: debouncedSearch.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setOrders(result.items)
      setTotalPages(Math.max(1, result.totalPages))
      setTotal(result.total)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar las órdenes.')
    } finally {
      setLoading(false)
    }
  }, [status, debouncedSearch, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [status, debouncedSearch])

  const changeStatus = async (order: Order, next: OrderStatus) => {
    setStatusBusy(next)
    try {
      const updated = await api.orders.updateStatus(order.id, next)
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setDetail((current) => (current && current.id === updated.id ? updated : current))
      toast(`Orden ${updated.orderNumber}: ${ORDER_STATUS_LABELS[next].toLowerCase()}`)
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos actualizar la orden.', 'error')
    } finally {
      setStatusBusy(null)
    }
  }

  const whatsAppHref = (order: Order) => {
    const digits = (order.customerPhone ?? '').replace(/\D/g, '')
    if (!digits) return null
    const phone = digits.length === 10 ? `52${digits}` : digits
    const message = `Hola ${order.customerName}, te contactamos de Eclipse Tech sobre tu orden ${order.orderNumber}.`
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Ventas"
        title="Órdenes"
        description="Revisa comprobantes, valida pagos y actualiza el estado de cada pedido."
        actions={
          <span className="badge border-white/[0.12] bg-white/[0.04] text-white/55">
            <ShoppingBag size={12} />
            {total} órdenes
          </span>
        }
      />

      <div className="panel mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={cn(
                'shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition',
                status === tab.key
                  ? 'bg-primary/15 text-primary'
                  : 'text-white/45 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative lg:w-80">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field pl-10"
            placeholder="Orden, cliente, email o teléfono…"
            aria-label="Buscar órdenes"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
          <button type="button" className="btn-secondary mt-3" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        {loading ? (
          <SkeletonRows rows={8} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No hay órdenes en esta vista"
            description="Cambia el filtro de estado o espera a que los clientes completen el checkout."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="table-head">Orden</th>
                  <th className="table-head">Cliente</th>
                  <th className="table-head">Artículos</th>
                  <th className="table-head">Pago</th>
                  <th className="table-head">Total</th>
                  <th className="table-head">Estado</th>
                  <th className="table-head">Fecha</th>
                  <th className="table-head text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {orders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-white/[0.025]">
                    <td className="table-cell font-mono text-xs text-white/60">{order.orderNumber}</td>
                    <td className="table-cell">
                      <p className="font-medium text-white/85">{order.customerName}</p>
                      <p className="text-[11px] text-white/30">
                        {order.customerEmail || order.customerPhone || 'Sin contacto'}
                      </p>
                    </td>
                    <td className="table-cell text-white/55">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} uds.
                    </td>
                    <td className="table-cell text-white/55">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</td>
                    <td className="table-cell">
                      <p className="font-semibold text-white">{formatCurrency(order.totalAmount)}</p>
                      {order.discountAmount > 0 ? (
                        <p className="text-[11px] text-emerald-300/70">
                          -{formatCurrency(order.discountAmount)}
                        </p>
                      ) : null}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="table-cell text-xs text-white/40">{formatDate(order.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setDetail(order)}
                          aria-label={`Ver orden ${order.orderNumber}`}
                          title="Ver detalle"
                        >
                          <Eye size={14} />
                        </button>
                        {order.status !== 'Verified' ? (
                          <button
                            type="button"
                            className="icon-btn hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-200"
                            onClick={() => void changeStatus(order, 'Verified')}
                            disabled={statusBusy !== null}
                            aria-label={`Verificar orden ${order.orderNumber}`}
                            title="Marcar verificada"
                          >
                            {statusBusy === 'Verified' ? <Spinner size={13} /> : <CheckCircle2 size={14} />}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-white/35">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-2"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft size={15} />
              Anterior
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-2"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
            >
              Siguiente
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Orden ${detail.orderNumber}` : 'Detalle de orden'}
        description={detail ? formatDate(detail.createdAt) : undefined}
        size="lg"
        footer={
          detail ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setDetail(null)}>
                Cerrar
              </button>
              {detail.status !== 'Pending' ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void changeStatus(detail, 'Pending')}
                  disabled={statusBusy !== null}
                >
                  {statusBusy === 'Pending' ? <Spinner size={14} /> : <RotateCcw size={15} />}
                  Marcar pendiente
                </button>
              ) : null}
              {detail.status !== 'Cancelled' ? (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => void changeStatus(detail, 'Cancelled')}
                  disabled={statusBusy !== null}
                >
                  {statusBusy === 'Cancelled' ? <Spinner size={14} /> : <XCircle size={15} />}
                  Cancelar orden
                </button>
              ) : null}
              {detail.status !== 'Verified' ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void changeStatus(detail, 'Verified')}
                  disabled={statusBusy !== null}
                >
                  {statusBusy === 'Verified' ? <Spinner size={14} /> : <CheckCircle2 size={15} />}
                  Verificar pago
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <span className="badge border-white/[0.12] bg-white/[0.04] text-white/55">
                {PAYMENT_METHOD_LABELS[detail.paymentMethod]}
              </span>
              {detail.couponCode ? (
                <span className="badge border-primary/25 bg-primary/10 text-primary">
                  Cupón {detail.couponCode}
                </span>
              ) : null}
              {detail.verifiedAt ? (
                <span className="text-[11px] text-emerald-300/70">
                  Verificada {formatDate(detail.verifiedAt)}
                </span>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Cliente
                </p>
                <p className="mt-2 font-medium text-white">{detail.customerName}</p>
                <div className="mt-2 space-y-1.5 text-xs text-white/45">
                  {detail.customerEmail ? (
                    <p className="flex items-center gap-2">
                      <Mail size={13} />
                      {detail.customerEmail}
                    </p>
                  ) : null}
                  {detail.customerPhone ? (
                    <p className="flex items-center gap-2">
                      <Phone size={13} />
                      {detail.customerPhone}
                    </p>
                  ) : null}
                </div>
                {whatsAppHref(detail) ? (
                  <a
                    href={whatsAppHref(detail) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary mt-3 w-full px-3 py-2 text-xs"
                  >
                    <MessageCircle size={14} />
                    Contactar por WhatsApp
                  </a>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Resumen de pago
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-white/50">
                    <dt>Subtotal</dt>
                    <dd>{formatCurrency(detail.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-emerald-300/80">
                    <dt>Descuento</dt>
                    <dd>-{formatCurrency(detail.discountAmount)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-white/[0.07] pt-2 font-semibold text-white">
                    <dt>Total</dt>
                    <dd>{formatCurrency(detail.totalAmount)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Artículos ({detail.items.length})
              </p>
              <ul className="space-y-2">
                {detail.items.map((item, index) => (
                  <li
                    key={`${item.productId ?? 'combo'}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Package size={15} className="text-white/35" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/85">{item.name}</p>
                      <p className="text-[11px] text-white/35">
                        {item.durationMonths} mes(es) · {item.quantity} uds.
                        {item.comboDiscountPercent > 0 ? ` · combo -${item.comboDiscountPercent}%` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {detail.notes ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/70">
                  Notas del cliente
                </p>
                <p className="mt-2 text-sm leading-6 text-white/65">{detail.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
