import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  EmptyState,
  FormError,
  Modal,
  PageHeader,
  SkeletonRows,
  Spinner,
  StatusBadge,
} from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useBrand } from '../hooks/useBrand'
import { api } from '../lib/api'
import { buildDeliveryMailto } from '../lib/deliveryMail'
import { useDebounce } from '../lib/hooks'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type DeliveredAccount,
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

function hasAdultItems(order: Order): boolean {
  return Boolean(order.adultVerification) || order.items.some((item) => item.isAdultOnly)
}

function emptyAccount(): DeliveredAccount {
  return { email: '', password: '', validFrom: '', validTo: '', platform: '' }
}

export function OrdersPage() {
  const { toast } = useToast()
  const { companyName } = useBrand()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [adultOnly, setAdultOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const debouncedSearch = useDebounce(search, 350)

  const [detail, setDetail] = useState<Order | null>(null)
  const [statusBusy, setStatusBusy] = useState<OrderStatus | null>(null)
  const [adultBusy, setAdultBusy] = useState(false)
  const [deliveryAccounts, setDeliveryAccounts] = useState<DeliveredAccount[]>([emptyAccount()])
  const [deliveryBusy, setDeliveryBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.orders.list({
        status: status === 'all' ? undefined : status,
        search: debouncedSearch.trim() || undefined,
        adultOnly,
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
  }, [status, debouncedSearch, adultOnly, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [status, debouncedSearch, adultOnly])

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

  const verifyAdult = async (order: Order, verified: boolean) => {
    setAdultBusy(true)
    try {
      const updated = await api.orders.verifyAdult(order.id, verified)
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setDetail((current) => (current && current.id === updated.id ? updated : current))
      toast(
        verified
          ? `Orden ${updated.orderNumber}: edad +18 verificada`
          : `Orden ${updated.orderNumber}: verificación +18 revertida`,
      )
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos actualizar la verificación +18.', 'error')
    } finally {
      setAdultBusy(false)
    }
  }

  const openDetail = (order: Order) => {
    setDetail(order)
    setDeliveryAccounts(
      order.deliveredAccounts?.length
        ? order.deliveredAccounts.map((account) => ({ ...account }))
        : [emptyAccount()],
    )
  }

  const updateDeliveryRow = (index: number, patch: Partial<DeliveredAccount>) => {
    setDeliveryAccounts((current) =>
      current.map((account, position) =>
        position === index ? { ...account, ...patch } : account,
      ),
    )
  }

  const saveDelivery = async (order: Order, emailSent: boolean) => {
    const accounts = deliveryAccounts
      .map((account) => ({
        email: account.email.trim(),
        password: account.password,
        validFrom: account.validFrom,
        validTo: account.validTo,
        platform: account.platform?.trim() || undefined,
      }))
      .filter((account) =>
        Boolean(account.email || account.password || account.validFrom || account.validTo),
      )

    if (accounts.length === 0) {
      toast('Agrega al menos una cuenta antes de guardar.', 'error')
      return
    }
    if (emailSent && !order.customerEmail) {
      toast('El pedido no tiene correo del cliente.', 'error')
      return
    }

    setDeliveryBusy(true)
    try {
      const updated = await api.orders.saveDelivery(order.id, accounts, emailSent)
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setDetail(updated)
      setDeliveryAccounts(
        updated.deliveredAccounts?.length
          ? updated.deliveredAccounts.map((account) => ({ ...account }))
          : accounts,
      )
      if (emailSent) {
        window.location.href = buildDeliveryMailto(updated, accounts, companyName)
        toast('Se abrió tu cliente de correo con las cuentas del pedido.')
      } else {
        toast('Cuentas guardadas correctamente.')
      }
    } catch (caught) {
      toast(
        caught instanceof Error ? caught.message : 'No pudimos guardar las cuentas.',
        'error',
      )
    } finally {
      setDeliveryBusy(false)
    }
  }

  const whatsAppHref = (order: Order) => {
    const digits = (order.customerPhone ?? '').replace(/\D/g, '')
    if (!digits) return null
    const phone = digits.length === 10 ? `52${digits}` : digits
    const message = `Hola ${order.customerName}, te contactamos de ${companyName} sobre tu orden ${order.orderNumber}.`
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
          <span className="mx-1 my-1 w-px shrink-0 bg-white/10" aria-hidden />
          <button
            type="button"
            onClick={() => setAdultOnly((current) => !current)}
            aria-pressed={adultOnly}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition',
              adultOnly
                ? 'bg-rose-500/15 text-rose-200'
                : 'text-white/45 hover:bg-white/[0.05] hover:text-white',
            )}
            title="Mostrar solo pedidos con contenido +18"
          >
            <ShieldCheck size={13} />
            +18
          </button>
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
                    <td className="table-cell font-mono text-xs text-white/60">
                      <span className="inline-flex items-center gap-1.5">
                        {order.orderNumber}
                        {hasAdultItems(order) ? (
                          <span className="rounded-md border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-200">
                            +18
                          </span>
                        ) : null}
                      </span>
                    </td>
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
                          onClick={() => openDetail(order)}
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

            {hasAdultItems(detail) ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.06] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-200/85">
                    <ShieldCheck size={14} />
                    Verificación +18
                  </p>
                  {detail.adultVerification?.verified ? (
                    <span className="badge border-emerald-400/25 bg-emerald-500/10 text-emerald-200">
                      <BadgeCheck size={12} />
                      Edad verificada
                    </span>
                  ) : (
                    <span className="badge border-amber-400/25 bg-amber-500/10 text-amber-200">
                      Pendiente de revisión
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-white/40">
                  Revisa la credencial antes de entregar el acceso. Confirma que la persona es mayor de 18 años y
                  que la foto corresponde al cliente.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {detail.adultVerification?.documentUrl ? (
                    <a
                      href={detail.adultVerification.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    >
                      <img
                        src={detail.adultVerification.documentUrl}
                        alt={`Credencial de ${detail.customerName}`}
                        className="h-44 w-full object-contain"
                      />
                      <span className="flex items-center justify-between border-t border-white/[0.07] px-3 py-2 text-[10px] text-white/45">
                        Credencial (INE/pasaporte)
                        <ExternalLink size={11} />
                      </span>
                    </a>
                  ) : (
                    <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/20 text-center">
                      <Package size={18} className="text-white/25" />
                      <p className="px-4 text-[10px] leading-5 text-white/30">
                        Este pedido no tiene foto de credencial adjunta.
                      </p>
                    </div>
                  )}

                  {detail.adultVerification?.selfieUrl ? (
                    <a
                      href={detail.adultVerification.selfieUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    >
                      <img
                        src={detail.adultVerification.selfieUrl}
                        alt={`Selfie con credencial de ${detail.customerName}`}
                        className="h-44 w-full object-contain"
                      />
                      <span className="flex items-center justify-between border-t border-white/[0.07] px-3 py-2 text-[10px] text-white/45">
                        Selfie con credencial
                        <ExternalLink size={11} />
                      </span>
                    </a>
                  ) : (
                    <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/20 text-center">
                      <Package size={18} className="text-white/25" />
                      <p className="px-4 text-[10px] leading-5 text-white/30">Sin selfie adjunta (opcional).</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-white/30">
                    {detail.adultVerification?.verifiedAt
                      ? `Verificada el ${formatDate(detail.adultVerification.verifiedAt)}`
                      : 'La foto viaja cifrada en tránsito y solo la ve el equipo admin.'}
                  </p>
                  <button
                    type="button"
                    className={detail.adultVerification?.verified ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => void verifyAdult(detail, !detail.adultVerification?.verified)}
                    disabled={adultBusy}
                  >
                    {adultBusy ? (
                      <Spinner size={14} />
                    ) : detail.adultVerification?.verified ? (
                      <RotateCcw size={14} />
                    ) : (
                      <BadgeCheck size={15} />
                    )}
                    {detail.adultVerification?.verified ? 'Revertir verificación' : 'Verificar +18'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/85">
                  <Mail size={14} />
                  Cuentas entregadas
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {detail.deliveredAt ? (
                    <span className="text-[10px] text-white/35">
                      Entregado {formatDate(detail.deliveredAt)}
                    </span>
                  ) : null}
                  {detail.deliveryEmailSent ? (
                    <Badge tone="success">
                      <CheckCircle2 size={11} />
                      Correo enviado
                    </Badge>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/40">
                Registra el correo y la contraseña de cada perfil entregado con su vigencia. Guarda
                los cambios o envíalos directamente al cliente por correo.
              </p>

              <div className="mt-4 space-y-3">
                {deliveryAccounts.map((account, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                  >
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        Cuenta {index + 1}
                      </span>
                      {deliveryAccounts.length > 1 ? (
                        <button
                          type="button"
                          className="icon-btn h-7 w-7 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                          onClick={() =>
                            setDeliveryAccounts((current) =>
                              current.filter((_, position) => position !== index),
                            )
                          }
                          aria-label={`Quitar cuenta ${index + 1}`}
                          title="Quitar cuenta"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-[10px] text-white/35">Correo / perfil</span>
                        <input
                          type="text"
                          value={account.email}
                          onChange={(event) =>
                            updateDeliveryRow(index, { email: event.target.value })
                          }
                          className="field"
                          placeholder="cuenta@netflix.com o Perfil 1"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] text-white/35">Contraseña</span>
                        <input
                          type="text"
                          value={account.password}
                          onChange={(event) =>
                            updateDeliveryRow(index, { password: event.target.value })
                          }
                          className="field"
                          placeholder="Contraseña del perfil"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] text-white/35">Vigencia desde</span>
                        <input
                          type="date"
                          value={account.validFrom}
                          onChange={(event) =>
                            updateDeliveryRow(index, { validFrom: event.target.value })
                          }
                          className="field"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] text-white/35">Vigencia hasta</span>
                        <input
                          type="date"
                          value={account.validTo}
                          onChange={(event) =>
                            updateDeliveryRow(index, { validTo: event.target.value })
                          }
                          className="field"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[10px] text-white/35">
                          Plataforma (opcional)
                        </span>
                        <input
                          type="text"
                          value={account.platform ?? ''}
                          onChange={(event) =>
                            updateDeliveryRow(index, { platform: event.target.value })
                          }
                          className="field"
                          placeholder="Netflix, Spotify, etc."
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs"
                  onClick={() =>
                    setDeliveryAccounts((current) => [...current, emptyAccount()])
                  }
                >
                  <Plus size={14} />
                  Agregar cuenta
                </button>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void saveDelivery(detail, false)}
                    disabled={deliveryBusy}
                  >
                    {deliveryBusy ? <Spinner size={14} /> : <CheckCircle2 size={14} />}
                    Guardar cuentas
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void saveDelivery(detail, true)}
                    disabled={deliveryBusy || !detail.customerEmail}
                    title={
                      detail.customerEmail
                        ? `Enviar a ${detail.customerEmail}`
                        : 'El pedido no tiene correo'
                    }
                  >
                    <Mail size={14} />
                    Enviar por correo
                  </button>
                </div>
              </div>
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
