import {
  BadgeCheck,
  Check,
  ExternalLink,
  Mail,
  Search,
  ShoppingBag,
  Users,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  PAYMENT_METHOD_LABELS,
  type CustomerProfile,
  type Order,
} from '../types'

type CustomerFilter = 'all' | 'students' | 'nonStudents'
type ApprovalFilter = 'all' | 'pending' | 'approved'

const CUSTOMER_FILTERS: Array<{ key: CustomerFilter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'students', label: 'Estudiantes' },
  { key: 'nonStudents', label: 'No estudiantes' },
]

const APPROVAL_OPTIONS: Array<{ key: ApprovalFilter; label: string }> = [
  { key: 'all', label: 'Estado: todos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobados' },
]

function customerName(profile: CustomerProfile): string {
  return profile.displayName.trim() || profile.email.split('@')[0] || 'Cliente'
}

export function CustomersPage() {
  const { toast } = useToast()
  const { companyName } = useBrand()
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CustomerFilter>('all')
  const [approval, setApprovalFilter] = useState<ApprovalFilter>('all')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<CustomerProfile | null>(null)
  const [orderDetail, setOrderDetail] = useState<Order | null>(null)
  const [busyUid, setBusyUid] = useState<string | null>(null)
  const [emailBusyId, setEmailBusyId] = useState<number | null>(null)
  const [discountPercent, setDiscountPercent] = useState(0)
  const debouncedSearch = useDebounce(search, 300)

  const fetchAllOrders = useCallback(async (): Promise<Order[]> => {
    const first = await api.orders.list({ pageSize: 100, page: 1 })
    const items = [...first.items]
    for (let page = 2; page <= first.totalPages; page += 1) {
      const next = await api.orders.list({ pageSize: 100, page })
      items.push(...next.items)
    }
    return items
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, settings, allOrders] = await Promise.all([
        api.customers.list(),
        api.settings.get(),
        fetchAllOrders(),
      ])
      setCustomers(list)
      setOrders(allOrders)
      setDiscountPercent(Number(settings.studentDiscountPercent) || 0)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar los clientes.')
    } finally {
      setLoading(false)
    }
  }, [fetchAllOrders])

  useEffect(() => {
    void load()
  }, [load])

  const students = customers.filter((customer) => customer.isStudent)
  const pendingCount = students.filter((customer) => !customer.studentApproved).length
  const approvedCount = students.length - pendingCount

  const ordersFor = useCallback(
    (customer: CustomerProfile): Order[] => {
      const email = customer.email.trim().toLowerCase()
      return orders.filter((order) => {
        const uidMatch = Boolean(
          customer.uid && order.customerUid && customer.uid === order.customerUid,
        )
        const emailMatch = Boolean(
          email && order.customerEmail?.trim().toLowerCase() === email,
        )
        return uidMatch || emailMatch
      })
    },
    [orders],
  )

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return customers.filter((customer) => {
      if (filter === 'students' && !customer.isStudent) return false
      if (filter === 'nonStudents' && customer.isStudent) return false
      if (approval === 'pending' && (!customer.isStudent || customer.studentApproved)) return false
      if (approval === 'approved' && (!customer.isStudent || !customer.studentApproved)) return false
      if (!term) return true
      return [customer.email, customer.displayName].some((value) =>
        value.toLowerCase().includes(term),
      )
    })
  }, [customers, filter, approval, debouncedSearch])

  const customerOrders = detail ? ordersFor(detail) : []

  const setApproval = async (customer: CustomerProfile, approved: boolean) => {
    setBusyUid(customer.uid)
    try {
      await api.customers.approve(customer.uid, approved)
      setCustomers((current) =>
        current.map((item) =>
          item.uid === customer.uid ? { ...item, studentApproved: approved } : item,
        ),
      )
      setDetail((current) =>
        current?.uid === customer.uid ? { ...current, studentApproved: approved } : current,
      )
      toast(
        approved
          ? `${customerName(customer)} ahora tiene el descuento de estudiante.`
          : `Aprobación de ${customerName(customer)} revertida.`,
      )
    } catch (caught) {
      toast(
        caught instanceof Error ? caught.message : 'No pudimos actualizar la aprobación.',
        'error',
      )
    } finally {
      setBusyUid(null)
    }
  }

  const sendOrderEmail = async (order: Order) => {
    const accounts = order.deliveredAccounts ?? []
    if (accounts.length === 0) {
      toast('Este pedido aún no tiene cuentas entregadas.', 'error')
      return
    }
    if (!order.customerEmail) {
      toast('El pedido no tiene correo del cliente.', 'error')
      return
    }
    setEmailBusyId(order.id)
    try {
      const updated = await api.orders.saveDelivery(order.id, accounts, true)
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      window.location.href = buildDeliveryMailto(updated, accounts, companyName)
      toast('Se abrió tu cliente de correo con las cuentas del pedido.')
    } catch (caught) {
      toast(
        caught instanceof Error ? caught.message : 'No pudimos preparar el correo.',
        'error',
      )
    } finally {
      setEmailBusyId(null)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Operación"
        title="Clientes"
        description="Consulta el perfil de cada cliente, revisa credenciales de estudiante y gestiona los pedidos asociados."
        actions={
          <span className="badge border-amber-400/25 bg-amber-400/10 text-amber-200">
            <Users size={12} />
            {pendingCount} pendientes
          </span>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Clientes', value: customers.length, tone: 'text-white' },
          { label: 'Estudiantes', value: students.length, tone: 'text-primary' },
          { label: 'Aprobados', value: approvedCount, tone: 'text-emerald-200' },
          { label: 'Solicitudes pendientes', value: pendingCount, tone: 'text-amber-200' },
        ].map((stat) => (
          <div key={stat.label} className="panel px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {stat.label}
            </p>
            <p className={cn('mt-1 font-display text-2xl font-semibold', stat.tone)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="panel mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {CUSTOMER_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                'shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition',
                filter === item.key
                  ? 'bg-primary/15 text-primary'
                  : 'text-white/45 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
          <select
            value={approval}
            onChange={(event) => setApprovalFilter(event.target.value as ApprovalFilter)}
            className="field sm:w-44"
            aria-label="Filtrar por estado de aprobación"
          >
            {APPROVAL_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative sm:w-72">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field pl-10"
              placeholder="Correo o nombre del cliente…"
              aria-label="Buscar clientes"
            />
          </div>
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
          <SkeletonRows rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin clientes en esta vista"
            description="Ajusta los filtros o espera a que nuevos clientes se registren en la tienda."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="table-head">Cliente</th>
                  <th className="table-head">Correo</th>
                  <th className="table-head">Estudiante</th>
                  <th className="table-head">Aprobación</th>
                  <th className="table-head">Pedidos</th>
                  <th className="table-head text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((customer) => {
                  const count = ordersFor(customer).length
                  return (
                    <tr
                      key={customer.uid}
                      className="cursor-pointer transition hover:bg-white/[0.025]"
                      onClick={() => setDetail(customer)}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                            <Users size={16} />
                          </span>
                          <span className="font-medium text-white/85">{customerName(customer)}</span>
                        </div>
                      </td>
                      <td className="table-cell text-xs text-white/50">{customer.email || '—'}</td>
                      <td className="table-cell">
                        {customer.isStudent ? (
                          <Badge tone="primary">Sí</Badge>
                        ) : (
                          <span className="text-xs text-white/35">No</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {!customer.isStudent ? (
                          <span className="text-xs text-white/25">—</span>
                        ) : customer.studentApproved ? (
                          <Badge tone="success">
                            <BadgeCheck size={12} />
                            Aprobado
                          </Badge>
                        ) : (
                          <Badge tone="warning">Pendiente</Badge>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="badge border-white/[0.12] bg-white/[0.04] text-white/55">
                          <ShoppingBag size={12} />
                          {count}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {customer.isStudent && customer.studentCredentialUrl ? (
                            <a
                              href={customer.studentCredentialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="icon-btn"
                              title="Ver credencial"
                              aria-label="Ver credencial"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : null}
                          {customer.isStudent ? (
                            customer.studentApproved ? (
                              <button
                                type="button"
                                className="icon-btn hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                                onClick={() => void setApproval(customer, false)}
                                disabled={busyUid === customer.uid}
                                title="Rechazar aprobación"
                                aria-label="Rechazar aprobación"
                              >
                                {busyUid === customer.uid ? <Spinner size={13} /> : <XCircle size={14} />}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="icon-btn hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-200"
                                onClick={() => void setApproval(customer, true)}
                                disabled={busyUid === customer.uid}
                                title="Aprobar estudiante"
                                aria-label="Aprobar estudiante"
                              >
                                {busyUid === customer.uid ? <Spinner size={13} /> : <Check size={14} />}
                              </button>
                            )
                          ) : null}
                          <button
                            type="button"
                            className="btn-secondary px-3 py-2 text-xs"
                            onClick={() => setDetail(customer)}
                          >
                            Ver detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Cliente · ${customerName(detail)}` : 'Detalle del cliente'}
        description={detail ? formatDate(detail.createdAt) : undefined}
        size="lg"
        footer={
          detail ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setDetail(null)}>
                Cerrar
              </button>
              {detail.isStudent ? (
                <>
                  <button
                    type="button"
                    className={detail.studentApproved ? 'btn-secondary' : 'btn-danger'}
                    onClick={() => void setApproval(detail, false)}
                    disabled={busyUid === detail.uid || !detail.studentApproved}
                  >
                    <XCircle size={15} />
                    Rechazar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void setApproval(detail, true)}
                    disabled={busyUid === detail.uid || detail.studentApproved}
                  >
                    {busyUid === detail.uid ? (
                      <Spinner size={14} />
                    ) : detail.studentApproved ? (
                      <Check size={15} />
                    ) : (
                      <BadgeCheck size={15} />
                    )}
                    {detail.studentApproved ? 'Aprobado' : 'Aprobar'}
                  </button>
                </>
              ) : null}
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {detail.isStudent ? (
                <Badge tone="primary">Estudiante</Badge>
              ) : (
                <Badge tone="neutral">Cliente estándar</Badge>
              )}
              {detail.isStudent ? (
                detail.studentApproved ? (
                  <Badge tone="success">
                    <BadgeCheck size={12} />
                    Aprobado
                  </Badge>
                ) : (
                  <Badge tone="warning">Pendiente</Badge>
                )
              ) : null}
              {detail.isStudent ? (
                <Badge tone="primary">Descuento configurado: {discountPercent}%</Badge>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Datos del cliente
              </p>
              <p className="mt-2 font-medium text-white">{customerName(detail)}</p>
              <p className="mt-1.5 flex items-center gap-2 text-xs text-white/45">
                <Mail size={13} />
                {detail.email || 'Sin correo registrado'}
              </p>
              <p className="mt-1 text-[11px] text-white/30">
                Registro: {formatDate(detail.createdAt)}
                {detail.updatedAt ? ` · Actualizado: ${formatDate(detail.updatedAt)}` : ''}
              </p>
            </div>

            {detail.isStudent ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Credencial de estudiante
                </p>
                {detail.studentCredentialUrl ? (
                  <a
                    href={detail.studentCredentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/30"
                  >
                    <img
                      src={detail.studentCredentialUrl}
                      alt={`Credencial de ${customerName(detail)}`}
                      className="max-h-[280px] w-full object-contain"
                    />
                    <span className="flex items-center justify-between border-t border-white/[0.07] px-3 py-2 text-[11px] text-white/45">
                      Abrir imagen original
                      <ExternalLink size={12} />
                    </span>
                  </a>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/35">
                    Este cliente no tiene una credencial adjunta.
                  </div>
                )}
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Pedidos asociados ({customerOrders.length})
              </p>
              {customerOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-xs text-white/35">
                  Este cliente aún no tiene pedidos registrados.
                </div>
              ) : (
                <ul className="space-y-2">
                  {customerOrders.map((order) => (
                    <li
                      key={order.id}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-white/70">{order.orderNumber}</p>
                          <p className="mt-0.5 text-[11px] text-white/30">
                            {formatDate(order.createdAt)} · {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2.5">
                        <span className="text-[11px] text-white/40">
                          {order.deliveredAccounts?.length ?? 0} cuentas entregadas
                        </span>
                        {order.deliveryEmailSent ? (
                          <Badge tone="success">Correo enviado</Badge>
                        ) : null}
                        <div className="ml-auto flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className="btn-secondary px-3 py-1.5 text-xs"
                            onClick={() => setOrderDetail(order)}
                          >
                            Ver detalle
                          </button>
                          <button
                            type="button"
                            className="btn-primary px-3 py-1.5 text-xs"
                            onClick={() => void sendOrderEmail(order)}
                            disabled={
                              emailBusyId === order.id ||
                              !order.customerEmail ||
                              !order.deliveredAccounts?.length
                            }
                          >
                            {emailBusyId === order.id ? (
                              <Spinner size={13} />
                            ) : (
                              <Mail size={13} />
                            )}
                            Enviar correo con cuentas
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={orderDetail !== null}
        onClose={() => setOrderDetail(null)}
        title={orderDetail ? `Pedido ${orderDetail.orderNumber}` : 'Detalle del pedido'}
        description={orderDetail ? formatDate(orderDetail.createdAt) : undefined}
        size="lg"
        footer={
          orderDetail ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setOrderDetail(null)}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void sendOrderEmail(orderDetail)}
                disabled={
                  emailBusyId === orderDetail.id ||
                  !orderDetail.customerEmail ||
                  !orderDetail.deliveredAccounts?.length
                }
              >
                {emailBusyId === orderDetail.id ? (
                  <Spinner size={14} />
                ) : (
                  <Mail size={14} />
                )}
                Enviar correo con cuentas
              </button>
            </>
          ) : null
        }
      >
        {orderDetail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={orderDetail.status} />
              <Badge tone="neutral">{PAYMENT_METHOD_LABELS[orderDetail.paymentMethod]}</Badge>
              <span className="text-sm font-semibold text-white">
                {formatCurrency(orderDetail.totalAmount)}
              </span>
              {orderDetail.deliveryEmailSent ? <Badge tone="success">Correo enviado</Badge> : null}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Artículos ({orderDetail.items.length})
              </p>
              <ul className="space-y-2">
                {orderDetail.items.map((item, index) => (
                  <li
                    key={`${item.productId ?? 'combo'}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/85">{item.name}</p>
                      <p className="text-[11px] text-white/35">
                        {item.quantity} uds. · {item.durationMonths} mes(es)
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Cuentas entregadas ({orderDetail.deliveredAccounts?.length ?? 0})
              </p>
              {orderDetail.deliveredAccounts?.length ? (
                <ul className="space-y-2">
                  {orderDetail.deliveredAccounts.map((account, index) => (
                    <li
                      key={`${account.email}-${index}`}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-white/85">
                          {account.platform ? `${account.platform} · ` : ''}{account.email}
                        </span>
                        <span className="font-mono text-white/55">{account.password}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-white/35">
                        Vigencia: {account.validFrom || '—'} al {account.validTo || '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/35">
                  Este pedido aún no tiene cuentas entregadas.
                </div>
              )}
              {orderDetail.deliveredAt ? (
                <p className="mt-2 text-[11px] text-white/30">
                  Entregado el {formatDate(orderDetail.deliveredAt)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
