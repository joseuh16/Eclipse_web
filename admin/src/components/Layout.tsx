import {
  Database,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Layers3,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  TicketPercent,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBrand } from '../hooks/useBrand'
import { useNavBadges } from '../hooks/useNavBadges'
import { cn, initials } from '../lib/utils'
import type { PageKey } from '../types'
import { Logo } from './Logo'

const NAV_ITEMS: Array<{
  key: PageKey
  label: string
  icon: typeof LayoutDashboard
  hint: string
  group: string
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Resumen', group: 'Operación' },
  { key: 'orders', label: 'Órdenes', icon: ShoppingBag, hint: 'Ventas', group: 'Operación' },
  { key: 'customers', label: 'Clientes', icon: Users, hint: 'Perfiles', group: 'Operación' },
  { key: 'products', label: 'Productos', icon: Package, hint: 'Catálogo', group: 'Catálogo' },
  { key: 'banners', label: 'Banners', icon: Megaphone, hint: 'Campañas', group: 'Catálogo' },
  { key: 'coupons', label: 'Cupones', icon: TicketPercent, hint: 'Descuentos', group: 'Catálogo' },
  { key: 'combos', label: 'Combos', icon: Layers3, hint: 'Niveles', group: 'Catálogo' },
  { key: 'theme', label: 'Temas', icon: Palette, hint: 'Apariencia', group: 'Apariencia' },
  { key: 'content', label: 'Contenido', icon: Globe, hint: 'Imágenes y noticias', group: 'Apariencia' },
  { key: 'settings', label: 'Pagos y contacto', icon: Settings, hint: 'Configuración', group: 'Configuración' },
  { key: 'database', label: 'Base de datos', icon: Database, hint: 'Nodos', group: 'Configuración' },
]

const STORE_URL = import.meta.env.VITE_STORE_URL || 'https://eclipse.techyuc.com'

const NAV_GROUPS: Array<{ label: string; items: Array<(typeof NAV_ITEMS)[number]> }> = [
  { label: 'Operación', items: NAV_ITEMS.filter((item) => item.group === 'Operación') },
  { label: 'Catálogo', items: NAV_ITEMS.filter((item) => item.group === 'Catálogo') },
  { label: 'Apariencia', items: NAV_ITEMS.filter((item) => item.group === 'Apariencia') },
  { label: 'Configuración', items: NAV_ITEMS.filter((item) => item.group === 'Configuración') },
]

export function Layout({
  page,
  onNavigate,
  children,
}: {
  page: PageKey
  onNavigate: (page: PageKey) => void
  children: ReactNode
}) {
  const { user, logout } = useAuth()
  const { companyName, logoUrl } = useBrand()
  const badges = useNavBadges()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [page])

  const current = NAV_ITEMS.find((item) => item.key === page) ?? NAV_ITEMS[0]

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo companyName={companyName} logoUrl={logoUrl} />
        <button
          type="button"
          className="icon-btn xl:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        >
          <X size={17} />
        </button>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-2" aria-label="Navegación principal">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = item.key === page
                const badgeCount =
                  item.key === 'orders'
                    ? badges.pendingOrders
                    : item.key === 'customers'
                      ? badges.pendingCustomers
                      : 0
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.key)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                        active
                          ? 'border border-primary/25 bg-primary/[0.12] text-white shadow-glow-sm'
                          : 'border border-transparent text-white/55 hover:bg-white/[0.05] hover:text-white',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span
                        className={cn(
                          'grid h-8 w-8 place-items-center rounded-lg border transition',
                          active
                            ? 'border-primary/30 bg-primary/15 text-primary'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/45 group-hover:text-white/80',
                        )}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {badgeCount > 0 ? (
                        <span
                          className="grid min-w-[20px] place-items-center rounded-full border border-amber-400/30 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-200"
                          title={`${badgeCount} pendientes`}
                        >
                          {badgeCount}
                        </span>
                      ) : null}
                      <span className="text-[10px] uppercase tracking-[0.12em] text-white/25">
                        {item.hint}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/[0.07] p-3">
        <a
          href={STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/55 transition hover:border-white/20 hover:text-white"
        >
          <ExternalLink size={14} />
          Ver tienda pública
        </a>
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
            {initials(user?.username ?? 'AD')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.username ?? 'Admin'}</p>
            <p className="truncate text-[11px] text-white/35">{user?.role ?? 'Administrador'}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="icon-btn h-8 w-8"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen xl:grid xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="safe-x safe-top safe-bottom fixed inset-y-0 left-0 z-40 hidden w-[17rem] border-r border-white/[0.07] bg-[#08080f]/80 backdrop-blur-2xl xl:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="safe-x safe-top safe-bottom absolute inset-y-0 left-0 w-[18rem] animate-slide-in-left border-r border-white/[0.07] bg-[#08080f] shadow-[24px_0_70px_-30px_rgba(0,0,0,.9)]">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 xl:col-start-2">
        <header className="safe-x safe-top sticky top-0 z-30 border-b border-white/[0.07] bg-[#06060d]/80 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="icon-btn xl:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu size={17} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Panel / {current.label}
                </p>
                <p className="truncate font-display text-sm font-semibold text-white">
                  {current.hint} de {companyName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-[11px] font-medium text-emerald-200 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Sesión protegida
              </span>
              <a href={STORE_URL} target="_blank" rel="noreferrer" className="icon-btn" aria-label="Abrir tienda">
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </header>

        <div className="safe-x safe-bottom">
          <main className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-8 sm:px-6 sm:pt-10 xl:px-10 xl:pb-12 xl:pt-12">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
