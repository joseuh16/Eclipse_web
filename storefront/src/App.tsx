import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useStore } from './context/StoreContext'
import { useCustomerAuth } from './context/CustomerAuthContext'
import { api } from './lib/api'
import {
  onOpenAccountModal,
  onOpenComboBuilder,
  onPaymentProof,
  type PaymentProofDetail,
} from './lib/events'
import { useLockBody } from './lib/hooks'
import { buildWhatsAppLink } from './lib/pricing'
import type { Banner, Category, Product } from './types'
// ---------------------------------------------------------------------------
// Eclipse Tech — storefront principal.
// # por que si puedo declarar variables pero no mi amor por ella
// # dia dos no dormi en el codigo porfa asi lo documentas y asi
// ---------------------------------------------------------------------------
import { AboutSection } from './components/AboutSection'
import { AnnouncementBar } from './components/AnnouncementBar'
import { CartDrawer } from './components/CartDrawer'
import { Catalog } from './components/Catalog'
import { CategoryPills } from './components/CategoryPills'
import { DoomsdayPromo } from './components/DoomsdayPromo'
import { FeaturedRail } from './components/FeaturedRail'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HeroCarousel } from './components/HeroCarousel'
import { MusicPlayer } from './components/MusicPlayer'
import { SupportChat } from './components/SupportChat'
import { TrustStrip } from './components/TrustStrip'

const AGE_KEY = 'eclipse_age_verified'

// Modales pesados: solo se descargan cuando el cliente los abre.
const AccountModal = lazy(() => import('./components/AccountModal').then((m) => ({ default: m.AccountModal })))
const AgeGateModal = lazy(() => import('./components/AgeGateModal').then((m) => ({ default: m.AgeGateModal })))
const CheckoutModal = lazy(() => import('./components/CheckoutModal').then((m) => ({ default: m.CheckoutModal })))
const ComboModal = lazy(() => import('./components/ComboModal').then((m) => ({ default: m.ComboModal })))
const PaymentProofModal = lazy(() => import('./components/PaymentProofModal').then((m) => ({ default: m.PaymentProofModal })))
const QuickBuyModal = lazy(() => import('./components/QuickBuyModal').then((m) => ({ default: m.QuickBuyModal })))

const CuentaPage = lazy(() => import('./components/CuentaPage').then((m) => ({ default: m.CuentaPage })))
const DalePlayPage = lazy(() => import('./components/DalePlayPage').then((m) => ({ default: m.DalePlayPage })))
const FaqPage = lazy(() => import('./components/FaqPage').then((m) => ({ default: m.FaqPage })))
const NewsPage = lazy(() => import('./components/NewsPage').then((m) => ({ default: m.NewsPage })))
const PromosPage = lazy(() => import('./components/PromosPage').then((m) => ({ default: m.PromosPage })))

function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '')
  return hash || 'home'
}

export default function App() {
  const {
    settings,
    openQuickBuy,
    cartOpen,
    checkoutOpen,
    quickBuyProduct,
    registerCheckoutGuard,
    closeCart,
    closeQuickBuy,
  } = useStore()
  const { user } = useCustomerAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')
  const [includeAdult, setIncludeAdult] = useState(
    () => window.sessionStorage.getItem(AGE_KEY) === '1',
  )
  const [ageGateOpen, setAgeGateOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)
  const [proof, setProof] = useState<PaymentProofDetail | null>(null)
  const [pendingAdultAction, setPendingAdultAction] = useState<null | (() => void)>(null)
  const [route, setRoute] = useState(getRoute)

  useLockBody(
    cartOpen || checkoutOpen || Boolean(quickBuyProduct) || ageGateOpen || comboOpen || Boolean(proof),
  )

  useEffect(() => {
    const onHash = () => {
      setRoute(getRoute())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Solo se puede comprar con sesión iniciada. Si no hay usuario, abrimos Cuenta.
  useEffect(() => {
    registerCheckoutGuard(() => {
      if (!user) {
        closeCart()
        closeQuickBuy()
        setAccountOpen(true)
        return false
      }
      return true
    })
  }, [user, registerCheckoutGuard, closeCart, closeQuickBuy])

  useEffect(() => onPaymentProof(setProof), [])
  useEffect(() => onOpenComboBuilder(() => setComboOpen(true)), [])
  useEffect(() => onOpenAccountModal(() => setAccountOpen(true)), [])

  useEffect(() => {
    let cancelled = false
    api
      .getBanners()
      .then((response) => {
        if (!cancelled) setBanners(response)
      })
      .catch(() => {
        if (!cancelled) setBanners([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const requireAdult = useCallback(
    (action: () => void) => {
      if (includeAdult) {
        action()
        return
      }
      setPendingAdultAction(() => action)
      setAgeGateOpen(true)
    },
    [includeAdult],
  )

  const handleOpenProduct = useCallback(
    (product: Product) => {
      if (product.isAdultOnly) {
        requireAdult(() => openQuickBuy(product))
        return
      }
      openQuickBuy(product)
    },
    [openQuickBuy, requireAdult],
  )

  const scrollToCatalog = () => {
    window.setTimeout(() => {
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const handleCategory = useCallback(
    (nextCategory: Category | 'all') => {
      if (nextCategory === 'AdultPlus') {
        requireAdult(() => {
          setCategory('AdultPlus')
          setSearch('')
          scrollToCatalog()
        })
        return
      }
      setCategory(nextCategory)
      setSearch('')
      scrollToCatalog()
    },
    [requireAdult],
  )

  const handleSearch = useCallback((term: string) => {
    setSearch(term)
    setCategory('all')
    scrollToCatalog()
  }, [])

  const confirmAdult = () => {
    window.sessionStorage.setItem(AGE_KEY, '1')
    setIncludeAdult(true)
    setAgeGateOpen(false)
    const action = pendingAdultAction
    setPendingAdultAction(null)
    window.setTimeout(() => action?.(), 120)
  }

  const closeAgeGate = () => {
    setAgeGateOpen(false)
    setPendingAdultAction(null)
  }

  const supportLink = buildWhatsAppLink(
    settings.whatsAppNumber,
    `Hola ${settings.companyName}, necesito ayuda con mi compra.`,
  )

  return (
    <div className="min-h-screen">
      <AnnouncementBar banners={banners} settings={settings} />
      <Header onSearch={handleSearch} includeAdult={includeAdult} onAccount={() => setAccountOpen(true)} />

      <Suspense fallback={<div className="page-shell py-20 text-center text-white/40">Cargando…</div>}>
        {route === 'faq' ? (
        <FaqPage />
      ) : route === 'noticias' || route.startsWith('noticias/') ? (
        <NewsPage slug={route.startsWith('noticias/') ? route.slice('noticias/'.length) : undefined} />
      ) : route === 'cuenta' ? (
        <CuentaPage />
      ) : route === 'promos' ? (
        <PromosPage banners={banners} />
      ) : route === 'dale-play' ? (
        <DalePlayPage />
      ) : (
        <main>
          <HeroCarousel banners={banners} />
          <TrustStrip />
          <AboutSection />
          <DoomsdayPromo />
          <CategoryPills active={category} onSelect={handleCategory} onCombos={() => setComboOpen(true)} />

          <FeaturedRail includeAdult={includeAdult} onOpen={handleOpenProduct} />

          <Catalog
            category={category}
            onCategoryChange={handleCategory}
            search={search}
            onSearchChange={setSearch}
            includeAdult={includeAdult}
            onOpenProduct={handleOpenProduct}
          />
        </main>
      )}
      </Suspense>

      <Footer />

      <a
        href={supportLink}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-5 z-40 hidden h-12 w-12 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500 text-white shadow-[0_10px_40px_-12px_rgba(16,185,129,.8)] transition hover:-translate-y-0.5 hover:brightness-110 sm:grid"
        aria-label="Abrir WhatsApp de soporte"
        title="Soporte por WhatsApp"
      >
        <MessageCircle size={20} />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#06060d] bg-accent" />
      </a>

      <CartDrawer onAccount={() => setAccountOpen(true)} />
      <MusicPlayer url={settings.musicUrl} />
      <SupportChat />

      <Suspense fallback={null}>
        {quickBuyProduct ? <QuickBuyModal /> : null}
        {checkoutOpen ? <CheckoutModal /> : null}
        {accountOpen ? <AccountModal open onClose={() => setAccountOpen(false)} /> : null}
        {ageGateOpen ? (
          <AgeGateModal open onClose={closeAgeGate} onConfirm={confirmAdult} />
        ) : null}
        <ComboModal open={comboOpen} onClose={() => setComboOpen(false)} />
        <PaymentProofModal open={Boolean(proof)} detail={proof} onClose={() => setProof(null)} />
      </Suspense>
    </div>
  )
}
