import { useEffect, useState } from 'react'
import { LogOut, Menu, MessageCircle, Search, ShoppingBag, User, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { useToast } from '../context/ToastContext'
import { buildWhatsAppLink } from '../lib/pricing'
import { cn } from '../lib/utils'
import { scrollToId } from '../lib/hooks'
import { Logo } from './Logo'
import { PredictiveSearch } from './PredictiveSearch'

interface HeaderProps {
  onSearch: (term: string) => void
  includeAdult: boolean
  onAccount: () => void
}

const NAV_ITEMS = [
  { label: 'Catálogo', id: 'catalogo', route: null as string | null },
  { label: 'Dale Play', id: null, route: 'dale-play' },
  { label: 'Noticias', id: null, route: 'noticias' },
  { label: 'FAQ', id: null, route: 'faq' },
]

export function Header({ onSearch, includeAdult, onAccount }: HeaderProps) {
  const { cartCount, openCart, settings } = useStore()
  const { user, profile, logout } = useCustomerAuth()
  const { toast } = useToast()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = profile?.displayName || user?.displayName || user?.email || ''
  const firstName = displayName.split(' ')[0] || 'Cliente'

  const handleLogout = async () => {
    await logout()
    setMobileOpen(false)
    toast('Cerraste sesión. ¡Hasta luego!', 'success')
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const goTo = (item: (typeof NAV_ITEMS)[number]) => {
    setMobileOpen(false)
    if (item.route) {
      window.location.hash = `#/${item.route}`
      return
    }
    if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '') {
      window.location.hash = '#/'
      window.setTimeout(() => scrollToId(item.id ?? ''), 120)
    } else if (item.id) {
      scrollToId(item.id)
    }
  }

  const search = (term: string) => {
    setMobileOpen(false)
    onSearch(term)
  }

  const supportLink = buildWhatsAppLink(
    settings.whatsAppNumber,
    `Hola ${settings.companyName}, quiero información sobre una licencia.`,
  )

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition duration-300',
        scrolled
          ? 'border-white/10 bg-[#080810]/88 shadow-[0_12px_40px_-24px_rgba(0,0,0,.9)] backdrop-blur-2xl'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="page-shell flex h-[72px] items-center gap-3 lg:gap-5">
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="icon-btn h-9 w-9"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={17} /> : <Menu size={18} />}
          </button>
        </div>

        <Logo onClick={() => { window.location.hash = '#/' }} />

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => goTo(item)}
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.055] hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden flex-1 justify-center px-1 md:flex lg:max-w-md">
          <PredictiveSearch includeAdult={includeAdult} onSearch={search} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={supportLink}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:text-white xl:flex"
          >
            <MessageCircle size={14} />
            Ayuda
          </a>

          <button
            type="button"
            onClick={() => {
              setMobileOpen((current) => !current)
            }}
            className="icon-btn md:hidden"
            aria-label="Abrir búsqueda"
          >
            <Search size={17} />
          </button>

          {user ? (
            <div className="hidden items-center gap-1.5 lg:flex">
              <button
                type="button"
                onClick={onAccount}
                className="flex max-w-[170px] items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-2.5 text-[11px] font-semibold text-white transition hover:border-primary/50"
                title="Ver mi cuenta y mis pedidos"
              >
                <User size={14} className="shrink-0 text-accent" />
                <span className="truncate">Hola, {firstName}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="icon-btn h-9 w-9"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAccount}
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:text-white lg:flex"
            >
              <User size={14} />
              Iniciar sesión
            </button>
          )}

          <button
            type="button"
            onClick={openCart}
            className="group relative flex h-11 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.055] pl-4 pr-2.5 text-white transition hover:border-primary/40 hover:bg-white/[0.09]"
            aria-label={`Abrir carrito con ${cartCount} productos`}
          >
            <span className="hidden text-[11px] font-semibold sm:block">Carrito</span>
            <span className="relative grid h-7 w-7 place-items-center rounded-full bg-white/10 transition group-hover:bg-primary/30">
              <ShoppingBag size={14} />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="absolute -right-1.5 -top-1.5 grid min-h-[18px] min-w-[18px] animate-pulse-ring place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-black"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#080810]/98 backdrop-blur-2xl lg:hidden">
          <div className="page-shell space-y-4 py-5">
            <PredictiveSearch includeAdult={includeAdult} onSearch={search} mobile />
            <nav className="grid grid-cols-2 gap-2" aria-label="Navegación móvil">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(item)}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left text-sm font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                >
                  {item.label}
                </button>
              ))}

              {user ? (
                <div className="col-span-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false)
                      onAccount()
                    }}
                    className="flex flex-1 items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-left text-sm font-semibold text-white"
                  >
                    <User size={15} className="shrink-0 text-accent" />
                    <span className="truncate">Hola, {firstName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/70"
                  >
                    <LogOut size={15} />
                    Salir
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    onAccount()
                  }}
                  className="col-span-2 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/70"
                >
                  <User size={15} />
                  Iniciar sesión
                </button>
              )}

              <a
                href={supportLink}
                target="_blank"
                rel="noreferrer"
                className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200"
              >
                <MessageCircle size={15} />
                Hablar con soporte
              </a>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
