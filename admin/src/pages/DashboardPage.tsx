import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  TicketPercent,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { EmptyState, FormError, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { formatCurrency, formatShortDate } from '../lib/utils'
import type { DashboardStats, PageKey } from '../types'

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string
  hint: string
  icon: ReactNode
  tone: string
}) {
  return (
    <div className="panel p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl border ${tone}`}>{icon}</span>
      </div>
      <p className="mt-3 text-[11px] text-white/35">{hint}</p>
    </div>
  )
}

export function DashboardPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      setStats(await api.dashboard.stats())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar el dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const maxRevenue = Math.max(1, ...(stats?.salesLast7Days.map((day) => day.revenue) ?? [0]))
  const maxUnits = Math.max(1, ...(stats?.topProducts.map((product) => product.units) ?? [0]))

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Resumen general"
        title="Dashboard"
        description="El pulso de la tienda: ventas pendientes, catálogo activo y actividad de los últimos 7 días."
        actions={
          <button type="button" className="btn-secondary" onClick={() => void load(true)} disabled={refreshing}>
            {refreshing ? <Spinner size={14} /> : <RefreshCw size={15} />}
            Actualizar
          </button>
        }
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      {loading || !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="skeleton h-36" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Ventas pendientes"
              value={String(stats.pendingOrders)}
              hint={`${formatCurrency(stats.pendingRevenue)} por verificar`}
              icon={<ShoppingBag size={18} />}
              tone="border-amber-400/25 bg-amber-400/10 text-amber-200"
            />
            <StatCard
              label="Órdenes de hoy"
              value={String(stats.todayOrders)}
              hint={`${stats.totalOrders} órdenes históricas`}
              icon={<CalendarClock size={18} />}
              tone="border-sky-400/25 bg-sky-400/10 text-sky-200"
            />
            <StatCard
              label="Productos activos"
              value={String(stats.activeProducts)}
              hint="Visibles en la tienda pública"
              icon={<Package size={18} />}
              tone="border-primary/25 bg-primary/10 text-primary"
            />
            <StatCard
              label="Ingresos verificados"
              value={formatCurrency(stats.verifiedRevenue)}
              hint="Órdenes con pago confirmado"
              icon={<Wallet size={18} />}
              tone="border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
            />
            <StatCard
              label="Cupones activos"
              value={String(stats.activeCoupons)}
              hint="Disponibles para canjear"
              icon={<TicketPercent size={18} />}
              tone="border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200"
            />
            <StatCard
              label="Ticket promedio"
              value={formatCurrency(
                stats.totalOrders > 0
                  ? (stats.verifiedRevenue + stats.pendingRevenue) / Math.max(1, stats.totalOrders)
                  : 0,
              )}
              hint="Promedio por orden registrada"
              icon={<CircleDollarSign size={18} />}
              tone="border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
            />
            <StatCard
              label="Conversión pendiente"
              value={
                stats.totalOrders > 0
                  ? `${Math.round((stats.pendingOrders / stats.totalOrders) * 100)}%`
                  : '0%'
              }
              hint="Órdenes por verificar del total"
              icon={<TrendingUp size={18} />}
              tone="border-orange-400/25 bg-orange-400/10 text-orange-200"
            />
            <StatCard
              label="Ingresos por cobrar"
              value={formatCurrency(stats.pendingRevenue)}
              hint="Pendiente de validación manual"
              icon={<Wallet size={18} />}
              tone="border-rose-400/25 bg-rose-400/10 text-rose-200"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <section className="panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">Últimos 7 días</h2>
                  <p className="mt-1 text-xs text-white/40">Ingresos verificados por día</p>
                </div>
                <span className="badge border-primary/25 bg-primary/10 text-primary">
                  {formatCurrency(stats.salesLast7Days.reduce((sum, day) => sum + day.revenue, 0))}
                </span>
              </div>
              <div className="flex h-48 items-end gap-2 sm:gap-3">
                {stats.salesLast7Days.map((day) => {
                  const percent = Math.max(4, Math.round((day.revenue / maxRevenue) * 100))
                  const date = new Date(`${day.date}T12:00:00`)
                  const label = Number.isNaN(date.getTime())
                    ? day.date
                    : new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(date)
                  return (
                    <div key={day.date} className="group flex h-full flex-1 flex-col justify-end gap-2">
                      <div className="relative flex flex-1 items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-primary/35 to-primary/80 transition group-hover:from-primary/50 group-hover:to-secondary"
                          style={{ height: `${percent}%` }}
                          title={`${day.orders} órdenes · ${formatCurrency(day.revenue)}`}
                        />
                        <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#12121f] px-2 py-0.5 text-[10px] text-white/70 group-hover:block">
                          {formatCurrency(day.revenue)}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">{label}</p>
                        <p className="text-[10px] text-white/25">{day.orders}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="panel p-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-accent" />
                <h2 className="font-display text-lg font-semibold text-white">Top productos</h2>
              </div>
              {stats.topProducts.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="Sin ventas verificadas"
                  description="Los productos más vendidos aparecerán al confirmar las primeras órdenes."
                />
              ) : (
                <ul className="space-y-4">
                  {stats.topProducts.map((product, index) => (
                    <li key={product.name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-white/50">
                            {index + 1}
                          </span>
                          <span className="truncate text-white/75">{product.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-white/40">{product.units} uds.</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                          style={{ width: `${Math.max(6, (product.units / maxUnits) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Órdenes recientes</h2>
                <p className="mt-1 text-xs text-white/40">Últimos movimientos registrados</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => onNavigate('orders')}>
                Ver todas
                <ArrowUpRight size={15} />
              </button>
            </div>
            {stats.recentOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="Todavía no hay órdenes"
                description="Cuando un cliente complete el checkout, la orden aparecerá aquí."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                    <tr>
                      <th className="table-head">Orden</th>
                      <th className="table-head">Cliente</th>
                      <th className="table-head">Pago</th>
                      <th className="table-head">Total</th>
                      <th className="table-head">Estado</th>
                      <th className="table-head">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {stats.recentOrders.map((order) => (
                      <tr key={order.id} className="transition hover:bg-white/[0.025]">
                        <td className="table-cell font-mono text-xs text-white/60">{order.orderNumber}</td>
                        <td className="table-cell">
                          <p className="font-medium text-white/85">{order.customerName}</p>
                          <p className="text-[11px] text-white/35">{order.customerEmail || order.customerPhone || '—'}</p>
                        </td>
                        <td className="table-cell text-white/55">{order.paymentMethod}</td>
                        <td className="table-cell font-semibold text-white">{formatCurrency(order.totalAmount)}</td>
                        <td className="table-cell">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="table-cell text-xs text-white/40">{formatShortDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
