// ---------------------------------------------------------------------------
// Capa de datos del panel sobre Firestore.
// Respaldo Firestore con la misma interfaz de la fachada principal (RTDB).
// Colecciones: products, banners, coupons, combos, orders, themes, settings/main.
// ---------------------------------------------------------------------------
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { signInAdmin, toAdminUser } from './firebaseAuth'
import { THEME_PRESET_BY_KEY, THEME_PRESETS } from './themePresets'
import type {
  Banner,
  BannerInput,
  Category,
  Combo,
  ComboInput,
  Coupon,
  CouponInput,
  DashboardStats,
  DailySales,
  LoginResponse,
  NewsItem,
  NewsInput,
  Order,
  OrderStatus,
  PagedResult,
  PaymentSettings,
  PaymentSettingsInput,
  Product,
  ProductInput,
  SiteContent,
  SiteContentInput,
  Theme,
  ThemeInput,
  ThemeResponse,
  TopProduct,
} from '../types'

const TOKEN_KEY = 'eclipse_admin_token'
export const UNAUTHORIZED_EVENT = 'eclipse:unauthorized'

export function getToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null, remember = true) {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(TOKEN_KEY)
    if (!token) return
    const storage = remember ? window.localStorage : window.sessionStorage
    storage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage may be unavailable; the in-memory session still works until reload.
  }
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function friendlyFirestoreError(error: unknown): ApiError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  if (code.includes('permission-denied')) {
    return new ApiError(
      'Firestore rechazó la operación. Revisa las reglas y que tu usuario tenga permisos de administrador.',
      403,
    )
  }
  if (code.includes('unavailable') || code.includes('failed-precondition')) {
    return new ApiError(
      'No pudimos conectar con Firestore. Verifica que la base de datos esté creada en Firebase Console.',
      0,
    )
  }
  if (code.includes('not-found')) {
    return new ApiError('La base de datos de Firestore no está creada en el proyecto Firebase.', 404)
  }
  return new ApiError(error instanceof Error ? error.message : 'Ocurrió un error con Firestore.', 0)
}

const OPERATION_TIMEOUT_MS = 12000

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = OPERATION_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new ApiError(`La operación de ${label} tardó demasiado.`, 0)), timeoutMs)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await withTimeout(operation(), 'operación')
  } catch (error) {
    throw friendlyFirestoreError(error)
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function iso(value: unknown): string {
  if (!value) return ''
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function mapDoc<T extends { id: number }>(id: string, data: Record<string, unknown>): T {
  const numeric = Number(data.id)
  return { ...data, id: Number.isFinite(numeric) ? numeric : Number(id) || 1 } as T
}

async function readAll<T extends { id: number }>(name: string): Promise<T[]> {
  return run(async () => {
    const snapshot = await getDocs(collection(db, name))
    return snapshot.docs.map((item) => mapDoc<T>(item.id, item.data()))
  })
}

async function readOne<T extends { id: number }>(name: string, id: number): Promise<T | null> {
  return run(async () => {
    const snapshot = await getDoc(doc(db, name, String(id)))
    return snapshot.exists() ? mapDoc<T>(snapshot.id, snapshot.data()) : null
  })
}

async function nextId(name: string): Promise<number> {
  const items = await readAll<{ id: number }>(name)
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

async function upsert<T extends { id: number }>(name: string, id: number, data: object): Promise<T> {
  return run(async () => {
    await setDoc(doc(db, name, String(id)), data, { merge: true })
    return { ...(data as object), id } as T
  })
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
function productFinalPrice(input: Pick<ProductInput, 'basePrice' | 'discountPercent'>): number {
  return round2(input.basePrice * (1 - input.discountPercent / 100))
}

function toProduct(id: number, data: Record<string, unknown>, createdAt: string): Product {
  const basePrice = Number(data.basePrice ?? 0)
  const discountPercent = Number(data.discountPercent ?? 0)
  return {
    id,
    name: String(data.name ?? ''),
    category: (data.category as Category) ?? 'Video',
    basePrice,
    finalPrice: round2(basePrice * (1 - discountPercent / 100)),
    discountPercent,
    durationMonths: Number(data.durationMonths ?? 1),
    imageUrl: String(data.imageUrl ?? ''),
    isActive: Boolean(data.isActive ?? true),
    isAdultOnly: Boolean(data.isAdultOnly ?? false),
    isFeatured: Boolean(data.isFeatured ?? false),
    createdAt,
  }
}

const products = {
  list: (params: { search?: string; category?: Category } = {}) =>
    run(async () => {
      const snapshot = await getDocs(collection(db, 'products'))
      const items = snapshot.docs.map((item) => {
        const data = item.data()
        const numeric = Number(data.id)
        const id = Number.isFinite(numeric) ? numeric : Number(item.id) || 1
        return toProduct(id, data, iso(data.createdAt))
      })
      const term = params.search?.trim().toLowerCase()
      return items
        .filter((product) => (params.category ? product.category === params.category : true))
        .filter((product) => (term ? product.name.toLowerCase().includes(term) : true))
        .sort((a, b) => b.id - a.id)
    }),

  create: (payload: ProductInput) =>
    run(async () => {
      const id = await nextId('products')
      const createdAt = new Date().toISOString()
      const data = { ...payload, id, finalPrice: productFinalPrice(payload), createdAt }
      return upsert<Product>('products', id, data)
    }),

  update: (id: number, payload: ProductInput) =>
    run(async () => {
      const current = await readOne<Product>('products', id)
      const createdAt = current?.createdAt ?? new Date().toISOString()
      const data = { ...payload, id, finalPrice: productFinalPrice(payload), createdAt }
      return upsert<Product>('products', id, data)
    }),

  toggle: (id: number) =>
    run(async () => {
      const current = await readOne<Product>('products', id)
      if (!current) throw new ApiError('Producto no encontrado.', 404)
      return upsert<Product>('products', id, { ...current, isActive: !current.isActive })
    }),

  remove: (id: number) => run(() => deleteDoc(doc(db, 'products', String(id))).then(() => undefined)),
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------
function toBanner(data: Record<string, unknown>, id: number): Banner {
  const expiryDate = data.expiryDate ? iso(data.expiryDate) : null
  const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    discountText: String(data.discountText ?? ''),
    expiryDate,
    isActive: Boolean(data.isActive ?? true),
    imageUrl: String(data.imageUrl ?? ''),
    ctaText: String(data.ctaText ?? 'Ver ofertas'),
    ctaUrl: String(data.ctaUrl ?? '#catalogo'),
    sortOrder: Number(data.sortOrder ?? 0),
    isExpired,
  }
}

const banners = {
  list: () =>
    run(async () => {
      const items = await readAll<Banner & Record<string, unknown>>('banners')
      return items
        .map((item) => toBanner(item, item.id))
        .sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id)
    }),

  create: (payload: BannerInput) =>
    run(async () => {
      const id = await nextId('banners')
      const data = { ...payload, id }
      await upsert<Banner>('banners', id, data)
      return toBanner(data, id)
    }),

  update: (id: number, payload: BannerInput) =>
    run(async () => {
      const data = { ...payload, id }
      await upsert<Banner>('banners', id, data)
      return toBanner(data, id)
    }),

  toggle: (id: number) =>
    run(async () => {
      const current = await readOne<Banner>('banners', id)
      if (!current) throw new ApiError('Banner no encontrado.', 404)
      const next = !current.isActive
      await upsert<Banner>('banners', id, { ...current, isActive: next })
      return toBanner({ ...current, isActive: next }, id)
    }),

  remove: (id: number) => run(() => deleteDoc(doc(db, 'banners', String(id))).then(() => undefined)),
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
function toCoupon(data: Record<string, unknown>, id: number): Coupon {
  const expiryDate = data.expiryDate ? iso(data.expiryDate) : null
  const maxUses = Number(data.maxUses ?? 0)
  const usedCount = Number(data.usedCount ?? 0)
  return {
    id,
    code: String(data.code ?? ''),
    discountPercent: Number(data.discountPercent ?? 0),
    maxUses,
    usedCount,
    expiryDate,
    isActive: Boolean(data.isActive ?? true),
    createdAt: iso(data.createdAt),
    isExpired: expiryDate ? new Date(expiryDate).getTime() < Date.now() : false,
    remainingUses: Math.max(0, maxUses - usedCount),
  }
}

const coupons = {
  list: () =>
    run(async () => {
      const items = await readAll<Coupon & Record<string, unknown>>('coupons')
      return items.map((item) => toCoupon(item, item.id)).sort((a, b) => b.id - a.id)
    }),

  create: (payload: CouponInput) =>
    run(async () => {
      const id = await nextId('coupons')
      const data = { ...payload, id, usedCount: 0, createdAt: new Date().toISOString() }
      await upsert<Coupon>('coupons', id, data)
      return toCoupon(data, id)
    }),

  update: (id: number, payload: CouponInput) =>
    run(async () => {
      const current = await readOne<Coupon>('coupons', id)
      const data = { ...payload, id, usedCount: current?.usedCount ?? 0, createdAt: current?.createdAt ?? new Date().toISOString() }
      await upsert<Coupon>('coupons', id, data)
      return toCoupon(data, id)
    }),

  toggle: (id: number) =>
    run(async () => {
      const current = await readOne<Coupon>('coupons', id)
      if (!current) throw new ApiError('Cupón no encontrado.', 404)
      const data = { ...current, isActive: !current.isActive }
      await upsert<Coupon>('coupons', id, data)
      return toCoupon(data, id)
    }),

  remove: (id: number) => run(() => deleteDoc(doc(db, 'coupons', String(id))).then(() => undefined)),
}

// ---------------------------------------------------------------------------
// Combos
// ---------------------------------------------------------------------------
const combos = {
  list: () => readAll<Combo>('combos').then((items) => items.sort((a, b) => a.minProfiles - b.minProfiles)),

  create: (payload: ComboInput) =>
    run(async () => {
      const id = await nextId('combos')
      const data = { ...payload, id, createdAt: new Date().toISOString() }
      return upsert<Combo>('combos', id, data)
    }),

  update: (id: number, payload: ComboInput) =>
    run(async () => {
      const current = await readOne<Combo>('combos', id)
      const data = { ...payload, id, createdAt: current?.createdAt ?? new Date().toISOString() }
      return upsert<Combo>('combos', id, data)
    }),

  toggle: (id: number) =>
    run(async () => {
      const current = await readOne<Combo>('combos', id)
      if (!current) throw new ApiError('Combo no encontrado.', 404)
      return upsert<Combo>('combos', id, { ...current, isActive: !current.isActive })
    }),

  remove: (id: number) => run(() => deleteDoc(doc(db, 'combos', String(id))).then(() => undefined)),
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
function toOrder(data: Record<string, unknown>, id: number): Order {
  return {
    id,
    orderNumber: String(data.orderNumber ?? `ECL-${id}`),
    customerName: String(data.customerName ?? ''),
    customerEmail: data.customerEmail ? String(data.customerEmail) : null,
    customerPhone: data.customerPhone ? String(data.customerPhone) : null,
    subtotal: Number(data.subtotal ?? 0),
    discountAmount: Number(data.discountAmount ?? 0),
    totalAmount: Number(data.totalAmount ?? 0),
    paymentMethod: (data.paymentMethod as Order['paymentMethod']) ?? 'BBVA',
    status: (data.status as OrderStatus) ?? 'Pending',
    couponCode: data.couponCode ? String(data.couponCode) : null,
    notes: data.notes ? String(data.notes) : null,
    items: Array.isArray(data.items) ? (data.items as Order['items']) : [],
    createdAt: iso(data.createdAt),
    verifiedAt: data.verifiedAt ? iso(data.verifiedAt) : null,
  }
}

const orders = {
  list: (params: {
    status?: OrderStatus
    search?: string
    from?: string
    to?: string
    page?: number
    pageSize?: number
  } = {}) =>
    run(async () => {
      const items = await readAll<Order & Record<string, unknown>>('orders')
      const term = params.search?.trim().toLowerCase()
      const filtered = items
        .map((item) => toOrder(item, item.id))
        .filter((order) => (params.status ? order.status === params.status : true))
        .filter((order) =>
          term
            ? [order.orderNumber, order.customerName, order.customerEmail, order.customerPhone]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term))
            : true,
        )
        .filter((order) => (params.from ? order.createdAt >= params.from : true))
        .filter((order) => (params.to ? order.createdAt <= params.to : true))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

      const page = Math.max(1, params.page ?? 1)
      const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20))
      const total = filtered.length
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const start = (page - 1) * pageSize
      return {
        items: filtered.slice(start, start + pageSize),
        page,
        pageSize,
        total,
        totalPages,
      } satisfies PagedResult<Order>
    }),

  get: async (id: number) => {
    const order = await readOne<Order & Record<string, unknown>>('orders', id)
    if (!order) throw new ApiError('Orden no encontrada.', 404)
    return toOrder(order, order.id)
  },

  updateStatus: (id: number, status: OrderStatus) =>
    run(async () => {
      const current = await readOne<Order & Record<string, unknown>>('orders', id)
      if (!current) throw new ApiError('Orden no encontrada.', 404)
      const data = {
        ...current,
        status,
        verifiedAt: status === 'Verified' ? new Date().toISOString() : null,
      }
      await upsert<Order>('orders', id, data)
      return toOrder(data, id)
    }),
}

// ---------------------------------------------------------------------------
// Settings (payment)
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS: PaymentSettings = {
  id: 1,
  companyName: 'Eclipse Tech',
  logoUrl: '',
  musicUrl: '',
  studentDiscountPercent: 0,
  bankName: 'BBVA México',
  beneficiary: 'Eclipse Digital',
  clabeNumber: '012180000000000000',
  mercadoPagoClabe: '722969000000000000',
  oxxoReference: 'ECLIPSE',
  whatsAppNumber: '5219971946172',
  supportEmail: 'soporte@eclipse.digital',
  paymentNote: 'Realiza tu pago y envía tu comprobante por WhatsApp con tu número de pedido.',
  updatedAt: '',
}

const settings = {
  get: () =>
    run(async () => {
      const snapshot = await getDoc(doc(db, 'settings', 'main'))
      if (!snapshot.exists()) return { ...DEFAULT_SETTINGS }
      const data = snapshot.data()
      return { ...DEFAULT_SETTINGS, ...data, id: 1, updatedAt: iso(data.updatedAt) } as PaymentSettings
    }),

  update: (payload: PaymentSettingsInput) =>
    run(async () => {
      const data = { ...payload, id: 1, updatedAt: new Date().toISOString() }
      await setDoc(doc(db, 'settings', 'main'), data, { merge: true })
      return data as PaymentSettings
    }),
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
function themeId(themeKey: string): number {
  let hash = 0
  for (let i = 0; i < themeKey.length; i += 1) hash = (hash * 31 + themeKey.charCodeAt(i)) >>> 0
  return hash || 1
}

function toTheme(data: Record<string, unknown>, fallbackKey: string): Theme {
  const themeKey = String(data.themeKey ?? fallbackKey)
  return {
    id: themeId(themeKey),
    themeKey,
    primaryColor: String(data.primaryColor ?? '#8B5CF6'),
    secondaryColor: String(data.secondaryColor ?? '#22D3EE'),
    accentColor: String(data.accentColor ?? '#FBBF24'),
    backgroundColor: String(data.backgroundColor ?? '#06060D'),
    fontStyle: String(data.fontStyle ?? 'Sora'),
    customCss: String(data.customCss ?? ''),
    isActive: Boolean(data.isActive ?? false),
    updatedAt: iso(data.updatedAt),
  }
}

const DEFAULT_THEME: Theme = toTheme(
  { themeKey: 'base', isActive: true, updatedAt: new Date().toISOString() },
  'base',
)

function presetTheme(preset: (typeof THEME_PRESETS)[number]): Theme {
  return toTheme(
    {
      themeKey: preset.key,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
      fontStyle: preset.fontStyle,
      customCss: preset.customCss,
      isActive: preset.key === 'base',
    },
    preset.key,
  )
}

const themes = {
  get: () =>
    run(async () => {
      const presets = THEME_PRESETS.map(presetTheme)
      const byKey = new Map(presets.map((theme) => [theme.themeKey, theme]))
      try {
        const [snapshot, pointer] = await Promise.all([
          getDocs(collection(db, 'themes')),
          getDoc(doc(db, 'settings', 'theme')).catch(() => null),
        ])
        snapshot.docs.forEach((item) => {
          const data = item.data()
          const preset = byKey.get(item.id)
          if (preset && !data.primaryColor) {
            // Documento incompleto (p. ej. solo activado): conserva el preset y su estado.
            byKey.set(item.id, { ...preset, isActive: Boolean(data.isActive) })
          } else {
            byKey.set(item.id, toTheme(data, item.id))
          }
        })
        const pointerData = pointer && pointer.exists() ? (pointer.data() as Record<string, unknown>) : null
        const pointerKey = pointerData ? String(pointerData.activeKey ?? '') : ''
        const items = [...byKey.values()]
        const active =
          (pointerKey ? items.find((theme) => theme.themeKey === pointerKey) : undefined) ??
          items.find((theme) => theme.isActive) ??
          items[0] ??
          DEFAULT_THEME
        return { active, themes: items } satisfies ThemeResponse
      } catch {
        // Sin Firestore todavía: mostramos los presets para poder previsualizarlos.
        return { active: presets[0] ?? DEFAULT_THEME, themes: presets } satisfies ThemeResponse
      }
    }),

  save: (payload: ThemeInput) =>
    run(async () => {
      const data = { ...payload, isActive: true, updatedAt: new Date().toISOString() }
      const batch = writeBatch(db)
      batch.set(doc(db, 'themes', payload.themeKey), data, { merge: true })
      batch.set(
        doc(db, 'settings', 'theme'),
        { activeKey: payload.themeKey, updatedAt: data.updatedAt },
        { merge: true },
      )
      await batch.commit()
      return toTheme(data as Record<string, unknown>, payload.themeKey)
    }),

  activate: (themeKey: string) =>
    run(async () => {
      const preset = THEME_PRESET_BY_KEY[themeKey]
      const existing = await getDoc(doc(db, 'themes', themeKey)).catch(() => null)
      const existingData = existing && existing.exists() ? (existing.data() as Record<string, unknown>) : null
      const data: Record<string, unknown> = existingData && existingData.primaryColor
        ? existingData
        : preset
          ? {
              themeKey,
              primaryColor: preset.primaryColor,
              secondaryColor: preset.secondaryColor,
              accentColor: preset.accentColor,
              backgroundColor: preset.backgroundColor,
              fontStyle: preset.fontStyle,
              customCss: preset.customCss,
              isActive: true,
              updatedAt: existingData?.updatedAt ?? new Date().toISOString(),
            }
          : { themeKey, isActive: true }

      const batch = writeBatch(db)
      if (!existingData || !existingData.primaryColor) {
        batch.set(doc(db, 'themes', themeKey), data, { merge: true })
      }
      batch.set(
        doc(db, 'settings', 'theme'),
        { activeKey: themeKey, updatedAt: new Date().toISOString() },
        { merge: true },
      )
      await batch.commit()
      return toTheme(data, themeKey)
    }),
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function dayKey(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const dashboard = {
  stats: () =>
    run(async () => {
      const [allOrders, allProducts, allCoupons] = await Promise.all([
        readAll<Order & Record<string, unknown>>('orders').then((items) =>
          items.map((item) => toOrder(item, item.id)),
        ),
        readAll<Product>('products'),
        readAll<Coupon & Record<string, unknown>>('coupons').then((items) =>
          items.map((item) => toCoupon(item, item.id)),
        ),
      ])

      const today = new Date().toISOString().slice(0, 10)
      const pending = allOrders.filter((order) => order.status === 'Pending')
      const verified = allOrders.filter((order) => order.status === 'Verified')

      const last7Days: DailySales[] = Array.from({ length: 7 }, (_, index) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - index))
        const key = date.toISOString().slice(0, 10)
        const dayOrders = verified.filter((order) => dayKey(order.createdAt) === key)
        return {
          date: key,
          orders: dayOrders.length,
          revenue: round2(dayOrders.reduce((sum, order) => sum + order.totalAmount, 0)),
        }
      })

      const productUnits = new Map<string, TopProduct>()
      verified.forEach((order) => {
        order.items.forEach((item) => {
          const current = productUnits.get(item.name) ?? { name: item.name, units: 0, revenue: 0 }
          current.units += item.quantity
          current.revenue = round2(current.revenue + item.lineTotal)
          productUnits.set(item.name, current)
        })
      })

      return {
        pendingOrders: pending.length,
        todayOrders: allOrders.filter((order) => dayKey(order.createdAt) === today).length,
        totalOrders: allOrders.length,
        activeProducts: allProducts.filter((product) => product.isActive).length,
        activeCoupons: allCoupons.filter((coupon) => coupon.isActive && !coupon.isExpired).length,
        verifiedRevenue: round2(verified.reduce((sum, order) => sum + order.totalAmount, 0)),
        pendingRevenue: round2(pending.reduce((sum, order) => sum + order.totalAmount, 0)),
        recentOrders: [...allOrders]
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          .slice(0, 6),
        salesLast7Days: last7Days,
        topProducts: [...productUnits.values()].sort((a, b) => b.units - a.units).slice(0, 5),
      } satisfies DashboardStats
    }),
}

// ---------------------------------------------------------------------------
// Contenido del sitio público (portada del hero + noticias)
// ---------------------------------------------------------------------------
const DEFAULT_SITE: SiteContent = {
  id: 1,
  heroImageUrl:
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1400&q=80',
  heroTitle: 'Tu entretenimiento, sin límites',
  heroDescription:
    'Licencias digitales de streaming, IA y productividad con entrega inmediata, pago seguro y soporte real.',
  updatedAt: '',
}

function toNewsItem(id: number, data: Record<string, unknown>): NewsItem {
  const bodyLines = Array.isArray(data.body)
    ? (data.body as unknown[]).map((line) => String(line))
    : [String(data.body ?? '')]
  return {
    id,
    slug: String(data.slug ?? ''),
    title: String(data.title ?? ''),
    date: String(data.date ?? ''),
    excerpt: String(data.excerpt ?? ''),
    imageUrl: String(data.imageUrl ?? ''),
    body: bodyLines,
    createdAt: String(data.createdAt ?? ''),
  }
}

async function readNewsSnapshot(): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const snapshot = await getDocs(collection(db, 'news'))
  return snapshot.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> }))
}

const content = {
  get: () =>
    run(async () => {
      const siteSnapshot = await getDoc(doc(db, 'settings', 'site')).catch(() => null)
      const newsSnapshot = await readNewsSnapshot().catch(async () => ([] as Array<{ id: string; data: Record<string, unknown> }>))
      const site: SiteContent = siteSnapshot && siteSnapshot.exists()
        ? {
            ...DEFAULT_SITE,
            ...(siteSnapshot.data() as Record<string, unknown>),
            id: 1,
            updatedAt: iso((siteSnapshot.data() as Record<string, unknown>).updatedAt),
          }
        : DEFAULT_SITE
      const news = newsSnapshot
        .map((item) => toNewsItem(Number(item.id) || 1, item.data))
        .sort((a, b) => b.id - a.id)
      return { site, news }
    }),

  saveSite: (payload: SiteContentInput) =>
    run(async () => {
      const data = { ...DEFAULT_SITE, ...payload, updatedAt: new Date().toISOString() }
      await setDoc(doc(db, 'settings', 'site'), data, { merge: true })
      return { ...DEFAULT_SITE, ...payload, id: 1, updatedAt: data.updatedAt } as SiteContent
    }),

  news: {
    list: () =>
      run(async () => {
        const news = await readNewsSnapshot().catch(
          async () => ([] as Array<{ id: string; data: Record<string, unknown> }>),
        )
        return news
          .map((item) => toNewsItem(Number(item.id) || 1, item.data))
          .sort((a, b) => b.id - a.id)
      }),

    create: (payload: NewsInput) =>
      run(async () => {
        const items = await content.news.list()
        const id = items.reduce((max, item) => Math.max(max, item.id), 0) + 1
        const data = { ...payload, id, createdAt: new Date().toISOString() }
        await setDoc(doc(db, 'news', String(id)), data)
        return toNewsItem(id, data)
      }),

    update: (id: number, payload: NewsInput) =>
      run(async () => {
        const items = await content.news.list()
        const existing = items.find((item) => item.id === id)
        const data = { ...payload, id, createdAt: existing?.createdAt ?? new Date().toISOString() }
        await setDoc(doc(db, 'news', String(id)), data)
        return toNewsItem(id, data)
      }),

    remove: (id: number) =>
      run(async () => {
        await deleteDoc(doc(db, 'news', String(id)))
        return undefined
      }),
  },
}

// ---------------------------------------------------------------------------
// API pública (misma forma que la anterior)
// ---------------------------------------------------------------------------
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const user = await signInAdmin(email, password, true)
      return {
        token: await user.getIdToken(),
        expiresAtUtc: '',
        user: toAdminUser(user),
      } satisfies LoginResponse
    },
    me: async () => {
      const user = auth.currentUser
      if (!user) throw new ApiError('Sesión no encontrada.', 401)
      return toAdminUser(user)
    },
  },

  dashboard,

  products,

  theme: themes,
  banners,
  coupons,
  combos,
  orders,
  settings,
  content,
}
