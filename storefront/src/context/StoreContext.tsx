import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import {
  cartSubtotal as computeSubtotal,
  comboLineId,
  productLineId,
  round2,
  couponDiscount,
} from '../lib/pricing'
import { hexToRgb } from '../lib/utils'
import type {
  AppliedCoupon,
  CartLine,
  Combo,
  PaymentSettings,
  Product,
  Theme,
} from '../types'
import { useToast } from './ToastContext'

const DEFAULT_THEME: Theme = {
  id: 0,
  themeKey: 'base',
  primaryColor: '#8B5CF6',
  secondaryColor: '#22D3EE',
  accentColor: '#FBBF24',
  backgroundColor: '#06060D',
  fontStyle: 'Sora',
  customCss: '',
  isActive: true,
  updatedAt: '',
}

/** Fuentes de temas: se descargan solo cuando el tema las necesita. */
const THEME_FONT_URLS: Record<string, string> = {
  Fraunces:
    'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap',
  'Special Elite': 'https://fonts.googleapis.com/css2?family=Special+Elite&display=swap',
  'Mountains of Christmas':
    'https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap',
  Cinzel: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap',
  'Playfair Display':
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  Fredoka: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap',
  Oswald: 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap',
  Outfit: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap',
}

function ensureThemeFont(font: string) {
  const url = THEME_FONT_URLS[font]
  document.querySelectorAll<HTMLLinkElement>('link[data-theme-font]').forEach((link) => {
    if (link.dataset.themeFont !== font) link.remove()
  })
  if (!url) return
  const id = `theme-font-${font.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.dataset.themeFont = font
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

const DEFAULT_SETTINGS: PaymentSettings = {
  id: 0,
  companyName: 'Eclipse Tech',
  logoUrl: '',
  musicUrl: '',
  studentDiscountPercent: 0,
  bankName: 'BBVA México',
  beneficiary: 'Eclipse Digital MX',
  clabeNumber: '012180015478965432',
  mercadoPagoClabe: '722969010123456789',
  oxxoReference: 'ECLIPSE-4821',
  whatsAppNumber: '5215512345678',
  supportEmail: 'soporte@techyuc.com',
  paymentNote: 'Envía tu comprobante por WhatsApp para validar tu pago.',
  updatedAt: '',
}

const CART_KEY = 'eclipse_cart_v1'

interface StoreContextValue {
  theme: Theme
  themes: Theme[]
  settings: PaymentSettings
  combos: Combo[]
  booting: boolean
  cart: CartLine[]
  cartCount: number
  cartSubtotal: number
  coupon: AppliedCoupon | null
  couponAmount: number
  cartTotal: number
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>
  removeCoupon: () => void
  addProduct: (product: Product, durationMonths: number, quantity?: number) => void
  addCombo: (products: Product[], durationMonths: number) => void
  updateLine: (id: string, patch: { durationMonths?: number; quantity?: number }) => void
  removeLine: (id: string) => void
  clearCart: () => void
  cartOpen: boolean
  openCart: () => void
  closeCart: () => void
  checkoutOpen: boolean
  openCheckout: () => void
  /** La App registra aquí la validación de login antes de comprar. */
  registerCheckoutGuard: (guard: () => boolean) => void
  closeCheckout: () => void
  quickBuyProduct: Product | null
  openQuickBuy: (product: Product) => void
  closeQuickBuy: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

function readCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((line): line is CartLine => {
      if (!line || typeof line !== 'object') return false
      const candidate = line as Partial<CartLine>
      if (candidate.kind === 'product') {
        return Boolean(candidate.product && candidate.durationMonths && candidate.quantity)
      }
      if (candidate.kind === 'combo') {
        return Boolean(candidate.products?.length && candidate.durationMonths && candidate.quantity)
      }
      return false
    })
  } catch {
    return []
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)
  const [themes, setThemes] = useState<Theme[]>([])
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_SETTINGS)
  const [combos, setCombos] = useState<Combo[]>([])
  const [booting, setBooting] = useState(true)
  const [cart, setCart] = useState<CartLine[]>(readCart)
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [quickBuyProduct, setQuickBuyProduct] = useState<Product | null>(null)
  const checkoutGuard = useRef<() => boolean>(() => true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [themeResult, settingsResult, combosResult] = await Promise.allSettled([
        api.getTheme(),
        api.getSettings(),
        api.getCombos(),
      ])

      if (cancelled) return

      if (themeResult.status === 'fulfilled') {
        setThemes(themeResult.value.themes ?? [])
        if (themeResult.value.active) {
          setTheme(themeResult.value.active)
        }
      }

      if (settingsResult.status === 'fulfilled') {
        setSettings(settingsResult.value)
      }

      if (combosResult.status === 'fulfilled') {
        setCombos(combosResult.value.filter((combo) => combo.isActive))
      }

      setBooting(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Refresca el tema al volver a la pestaña: si el admin aplica un tema nuevo,
  // la tienda lo toma sin necesidad de recargar la página.
  useEffect(() => {
    let cancelled = false
    const refreshTheme = async () => {
      try {
        const result = await api.getTheme()
        if (cancelled || !result.active) return
        setTheme(result.active)
        setThemes(result.themes ?? [])
      } catch {
        // Sin conexión: conserva el tema actual.
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshTheme()
    }
    window.addEventListener('focus', refreshTheme)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshTheme)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--primary-rgb', hexToRgb(theme.primaryColor))
    root.style.setProperty('--secondary-rgb', hexToRgb(theme.secondaryColor))
    root.style.setProperty('--accent-rgb', hexToRgb(theme.accentColor))
    root.style.setProperty('--bg-rgb', hexToRgb(theme.backgroundColor))
    root.style.setProperty('--color-primary', theme.primaryColor)
    root.style.setProperty('--color-secondary', theme.secondaryColor)
    root.style.setProperty('--color-accent', theme.accentColor)
    root.style.setProperty('--color-bg', theme.backgroundColor)
    root.style.setProperty('--font-app', `'${theme.fontStyle || 'Sora'}'`)
    root.style.setProperty('--font-display', `'${theme.fontStyle || 'Sora'}'`)
    ensureThemeFont(theme.fontStyle || 'Sora')
    root.style.colorScheme = 'dark'
    root.classList.add('dark')

    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme.backgroundColor)

    const styleId = 'eclipse-theme-custom-css'
    let style = document.getElementById(styleId) as HTMLStyleElement | null
    if (theme.customCss) {
      if (!style) {
        style = document.createElement('style')
        style.id = styleId
        document.head.appendChild(style)
      }
      style.textContent = theme.customCss
    } else if (style) {
      style.remove()
    }
  }, [theme])

  // El nombre de la empresa configurado en el panel se refleja en el navegador.
  useEffect(() => {
    const name = settings.companyName || 'Eclipse Tech'
    document.title = `${name} — Licencias digitales y streaming`
    const ogTitle = document.querySelector('meta[property="og:title"]')
    ogTitle?.setAttribute('content', name)
  }, [settings.companyName])

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      // Storage can be unavailable in private modes. The cart still works in memory.
    }
  }, [cart])

  const cartCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  )
  const cartSubtotal = useMemo(() => computeSubtotal(cart, combos), [cart, combos])
  const couponAmount = useMemo(
    () => (coupon ? couponDiscount(cartSubtotal, coupon.discountPercent) : 0),
    [coupon, cartSubtotal],
  )
  const cartTotal = useMemo(
    () => round2(Math.max(0, cartSubtotal - couponAmount)),
    [cartSubtotal, couponAmount],
  )

  const addProduct = useCallback(
    (product: Product, durationMonths: number, quantity = 1) => {
      setCart((current) => {
        const id = productLineId(product.id, durationMonths)
        const existing = current.find((line) => line.id === id)
        if (existing) {
          return current.map((line) =>
            line.id === id ? { ...line, quantity: Math.min(10, line.quantity + quantity) } : line,
          )
        }
        return [...current, { id, kind: 'product', product, durationMonths, quantity }]
      })
      toast(`${product.name} se agregó al carrito`, 'success')
    },
    [toast],
  )

  const addCombo = useCallback(
    (products: Product[], durationMonths: number) => {
      if (products.length < 2) {
        toast('Selecciona al menos 2 perfiles para crear tu combo', 'info')
        return
      }

      const ids = products.map((product) => product.id)
      const id = comboLineId(ids, durationMonths)
      setCart((current) => {
        if (current.some((line) => line.id === id)) {
          toast('Ese combo ya está en tu carrito', 'info')
          return current
        }
        return [...current, { id, kind: 'combo', products, durationMonths, quantity: 1 }]
      })
      toast(`Combo de ${products.length} perfiles agregado`, 'success')
    },
    [toast],
  )

  const updateLine = useCallback(
    (id: string, patch: { durationMonths?: number; quantity?: number }) => {
      setCart((current) =>
        current.map((line) => {
          if (line.id !== id) return line
          const durationMonths = patch.durationMonths ?? line.durationMonths
          const quantity =
            patch.quantity === undefined ? line.quantity : Math.max(1, Math.min(10, patch.quantity))
          const newId =
            line.kind === 'product'
              ? productLineId(line.product.id, durationMonths)
              : comboLineId(line.products.map((product) => product.id), durationMonths)
          return { ...line, id: newId, durationMonths, quantity }
        }),
      )
    },
    [],
  )

  const removeLine = useCallback((id: string) => {
    setCart((current) => current.filter((line) => line.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setCoupon(null)
  }, [])

  const applyCoupon = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      return { ok: false, message: 'Escribe un código de descuento.' }
    }

    try {
      const result = await api.validateCoupon(normalized)
      if (!result.valid) {
        return { ok: false, message: result.message || 'El cupón no es válido.' }
      }
      setCoupon({ code: result.code, discountPercent: result.discountPercent })
      return { ok: true, message: result.message }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'No pudimos validar el cupón.',
      }
    }
  }, [])

  const removeCoupon = useCallback(() => setCoupon(null), [])

  const openCart = useCallback(() => {
    setQuickBuyProduct(null)
    setCheckoutOpen(false)
    setCartOpen(true)
  }, [])

  const closeCart = useCallback(() => setCartOpen(false), [])

  const registerCheckoutGuard = useCallback((guard: () => boolean) => {
    checkoutGuard.current = guard
  }, [])

  const openCheckout = useCallback(() => {
    if (!checkoutGuard.current()) return
    setCartOpen(false)
    setQuickBuyProduct(null)
    setCheckoutOpen(true)
  }, [])

  const closeCheckout = useCallback(() => setCheckoutOpen(false), [])

  const openQuickBuy = useCallback((product: Product) => {
    setCartOpen(false)
    setCheckoutOpen(false)
    setQuickBuyProduct(product)
  }, [])

  const closeQuickBuy = useCallback(() => setQuickBuyProduct(null), [])

  const value = useMemo<StoreContextValue>(
    () => ({
      theme,
      themes,
      settings,
      combos,
      booting,
      cart,
      cartCount,
      cartSubtotal,
      coupon,
      couponAmount,
      cartTotal,
      applyCoupon,
      removeCoupon,
      addProduct,
      addCombo,
      updateLine,
      removeLine,
      clearCart,
      cartOpen,
      openCart,
      closeCart,
      checkoutOpen,
      openCheckout,
      registerCheckoutGuard,
      closeCheckout,
      quickBuyProduct,
      openQuickBuy,
      closeQuickBuy,
    }),
    [
      theme,
      themes,
      settings,
      combos,
      booting,
      cart,
      cartCount,
      cartSubtotal,
      coupon,
      couponAmount,
      cartTotal,
      applyCoupon,
      removeCoupon,
      addProduct,
      addCombo,
      updateLine,
      removeLine,
      clearCart,
      cartOpen,
      openCart,
      closeCart,
      checkoutOpen,
      openCheckout,
      registerCheckoutGuard,
      closeCheckout,
      quickBuyProduct,
      openQuickBuy,
      closeQuickBuy,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore debe usarse dentro de StoreProvider')
  }
  return context
}
