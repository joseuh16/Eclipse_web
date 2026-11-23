// ---------------------------------------------------------------------------
// Fuente de datos de la tienda en Firestore (panel administrativo).
// Si Firestore no está disponible, la tienda cae automáticamente a la RTDB.
// ---------------------------------------------------------------------------
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { round2 } from './pricing'
import type {
  Banner,
  Category,
  Combo,
  CouponValidation,
  PagedResult,
  PaymentSettings,
  Product,
  ProductQuery,
  Theme,
  ThemeResponse,
} from '../types'

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function num(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toProduct(id: number, data: Record<string, unknown>): Product {
  const basePrice = num(data.basePrice)
  const discountPercent = Math.max(0, Math.min(100, num(data.discountPercent)))
  const finalPrice = data.finalPrice !== undefined
    ? num(data.finalPrice)
    : round2(basePrice * (1 - discountPercent / 100))
  return {
    id,
    name: text(data.name),
    category: (text(data.category) as Category) || 'Video',
    basePrice,
    finalPrice,
    discountPercent,
    durationMonths: num(data.durationMonths) || 1,
    imageUrl: text(data.imageUrl),
    isActive: Boolean(data.isActive ?? true),
    isAdultOnly: Boolean(data.isAdultOnly),
    isFeatured: Boolean(data.isFeatured),
    createdAt: text(data.createdAt),
  }
}

function productId(docId: string, data: Record<string, unknown>): number {
  const numeric = Number(data.id)
  return Number.isFinite(numeric) ? numeric : Number(docId) || 1
}

export async function firestoreGetProducts(queryParams: ProductQuery = {}): Promise<PagedResult<Product>> {
  const snapshot = await getDocs(collection(db, 'products'))
  let items = snapshot.docs
    .map((item) => toProduct(productId(item.id, item.data()), item.data()))
    .filter((product) => product.isActive)

  if (!queryParams.includeAdult) items = items.filter((product) => !product.isAdultOnly)
  if (queryParams.category) items = items.filter((product) => product.category === queryParams.category)
  if (queryParams.search) {
    const term = queryParams.search.trim().toLowerCase()
    items = items.filter((product) => product.name.toLowerCase().includes(term))
  }
  if (queryParams.featured) items = items.filter((product) => product.isFeatured)
  if (queryParams.minPrice !== undefined) items = items.filter((product) => product.finalPrice >= queryParams.minPrice!)
  if (queryParams.maxPrice !== undefined) items = items.filter((product) => product.finalPrice <= queryParams.maxPrice!)

  const sort = queryParams.sort || 'newest'
  items = [...items].sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return a.finalPrice - b.finalPrice
      case 'price_desc':
        return b.finalPrice - a.finalPrice
      case 'name':
        return a.name.localeCompare(b.name, 'es')
      case 'discount':
        return b.discountPercent - a.discountPercent || a.finalPrice - b.finalPrice
      case 'newest':
      default:
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || a.name.localeCompare(b.name, 'es')
    }
  })

  const page = Math.max(1, queryParams.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, queryParams.pageSize ?? 12))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize

  return { items: items.slice(start, start + pageSize), page, pageSize, total, totalPages }
}

export async function firestoreGetBanners(): Promise<Banner[]> {
  const snapshot = await getDocs(collection(db, 'banners'))
  return snapshot.docs
    .map((item) => {
      const data = item.data()
      const expiryDate = text(data.expiryDate) || null
      const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false
      return {
        id: productId(item.id, data),
        title: text(data.title) || 'Promoción Eclipse',
        description: text(data.description),
        discountText: text(data.discountText),
        expiryDate,
        isActive: Boolean(data.isActive ?? true),
        imageUrl: text(data.imageUrl),
        ctaText: text(data.ctaText) || 'Ver más',
        ctaUrl: text(data.ctaUrl) || '#/',
        sortOrder: num(data.sortOrder),
        isExpired,
      } satisfies Banner
    })
    .filter((banner) => banner.isActive && !banner.isExpired)
    .sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id)
}

const DEFAULT_SETTINGS: PaymentSettings = {
  id: 1,
  companyName: 'Eclipse Tech',
  logoUrl: '',
  studentDiscountPercent: 0,
  bankName: 'BBVA México',
  beneficiary: 'Eclipse Digital',
  clabeNumber: '012180000000000000',
  mercadoPagoClabe: '722969000000000000',
  oxxoReference: 'ECLIPSE',
  whatsAppNumber: '5219971946172',
  supportEmail: 'soporte@eclipse.digital',
  paymentNote: 'Realiza tu pago y envía tu comprobante por WhatsApp con tu número de pedido para validar tu compra.',
  updatedAt: '',
}

export async function firestoreGetSettings(): Promise<PaymentSettings> {
  const snapshot = await getDoc(doc(db, 'settings', 'main'))
  if (!snapshot.exists()) throw new Error('settings/empty')
  const data = snapshot.data()
  return { ...DEFAULT_SETTINGS, ...data, id: 1, updatedAt: text(data.updatedAt) } as PaymentSettings
}

export async function firestoreGetCombos(): Promise<Combo[]> {
  const snapshot = await getDocs(collection(db, 'combos'))
  return snapshot.docs
    .map((item) => {
      const data = item.data()
      return {
        id: productId(item.id, data),
        name: text(data.name),
        description: text(data.description),
        minProfiles: num(data.minProfiles),
        discountPercent: num(data.discountPercent),
        isActive: Boolean(data.isActive ?? true),
        createdAt: text(data.createdAt),
      } satisfies Combo
    })
    .filter((combo) => combo.isActive)
    .sort((a, b) => a.minProfiles - b.minProfiles)
}

export async function firestoreGetTheme(): Promise<ThemeResponse> {
  const snapshot = await getDocs(collection(db, 'themes'))
  const themes = snapshot.docs.map((item) => {
    const data = item.data() as Record<string, unknown>
    return {
      id: productId(item.id, data),
      themeKey: text(data.themeKey) || item.id,
      primaryColor: text(data.primaryColor) || '#8B5CF6',
      secondaryColor: text(data.secondaryColor) || '#22D3EE',
      accentColor: text(data.accentColor) || '#FBBF24',
      backgroundColor: text(data.backgroundColor) || '#06060D',
      fontStyle: text(data.fontStyle) || 'Sora',
      customCss: text(data.customCss),
      isActive: Boolean(data.isActive),
      updatedAt: text(data.updatedAt),
    } satisfies Theme
  })
  const pointer = await getDoc(doc(db, 'settings', 'theme')).catch(() => null)
  const pointerData = pointer && pointer.exists() ? (pointer.data() as Record<string, unknown>) : null
  const pointerKey = pointerData ? String(pointerData.activeKey ?? '') : ''
  const active = (pointerKey ? themes.find((theme) => theme.themeKey === pointerKey) : undefined) ?? themes.find((theme) => theme.isActive) ?? themes[0]
  if (!active) throw new Error('themes/empty')
  return { active, themes }
}

export interface SiteContent {
  heroImageUrl: string
  heroTitle: string
  heroDescription: string
  updatedAt: string
}

export const DEFAULT_SITE: SiteContent = {
  heroImageUrl:
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1400&q=80',
  heroTitle: 'Tu entretenimiento, sin límites',
  heroDescription:
    'Licencias digitales de streaming, IA y productividad con entrega inmediata, pago seguro y soporte real.',
  updatedAt: '',
}

export interface NewsItem {
  id: number
  slug: string
  title: string
  date: string
  excerpt: string
  imageUrl: string
  body: string[]
  createdAt: string
}

export async function firestoreGetSiteContent(): Promise<{ site: SiteContent; news: NewsItem[] }> {
  const siteSnapshot = await getDoc(doc(db, 'settings', 'site')).catch(() => null)
  const newsSnapshot = await getDocs(collection(db, 'news'))
  const site: SiteContent = siteSnapshot && siteSnapshot.exists()
    ? {
        ...DEFAULT_SITE,
        ...(siteSnapshot.data() as Record<string, unknown>),
        updatedAt: String((siteSnapshot.data() as Record<string, unknown>).updatedAt ?? ''),
      }
    : DEFAULT_SITE
  const news = newsSnapshot.docs
    .map((item) => {
      const data = item.data() as Record<string, unknown>
      return {
        id: productId(item.id, data),
        slug: String(data.slug ?? ''),
        title: String(data.title ?? ''),
        date: String(data.date ?? ''),
        excerpt: String(data.excerpt ?? ''),
        imageUrl: String(data.imageUrl ?? ''),
        body: Array.isArray(data.body) ? (data.body as string[]).map((line) => String(line)) : [''],
        createdAt: String(data.createdAt ?? ''),
      } satisfies NewsItem
    })
    .sort((a, b) => b.id - a.id)
  return { site, news }
}

export async function firestoreValidateCoupon(code: string): Promise<CouponValidation> {
  const normalized = code.trim().toUpperCase()
  const snapshot = await getDocs(
    query(collection(db, 'coupons'), where('code', '==', normalized), limit(1)),
  )
  if (snapshot.empty) {
    return { valid: false, code: normalized, discountPercent: 0, message: 'El cupón no es válido o no está disponible por ahora.' }
  }
  const data = snapshot.docs[0].data()
  const isActive = Boolean(data.isActive ?? true)
  const discountPercent = num(data.discountPercent)
  const maxUses = num(data.maxUses)
  const usedCount = num(data.usedCount)
  const expiryDate = text(data.expiryDate)
  const expired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false
  const exhausted = maxUses > 0 && usedCount >= maxUses
  if (!isActive || expired || exhausted || discountPercent <= 0) {
    return { valid: false, code: normalized, discountPercent: 0, message: 'El cupón no es válido o ya expiró.' }
  }
  return {
    valid: true,
    code: normalized,
    discountPercent,
    message: `Cupón aplicado: ${discountPercent}% de descuento.`,
  }
}
