// ---------------------------------------------------------------------------
// Capa de datos del panel conectada a Firebase Realtime Database (RTDB).
// Lee los nodos: catalogo, promociones, combos, themes, settings, coupons,
// content, orders — todo con la misma instancia `rtdb` de ./firebase.
// ---------------------------------------------------------------------------
import { get, ref, remove, set } from 'firebase/database'
import { rtdb } from './firebase'
import { round2 } from './utils'
import type {
  Banner,
  Category,
  Combo,
  Coupon,
  CouponValidation,
  NewsItem,
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
  ThemeResponse,
} from '../types'

type RtdbData = Record<string, unknown>

let cache: RtdbData | null = null
let cachePromise: Promise<RtdbData> | null = null
export const bannerKeys: Map<number, string> = new Map<number, string>()

async function readNode(path: string): Promise<unknown> {
  try {
    const snap = await get(ref(rtdb, path))
    return snap.exists() ? snap.val() : null
  } catch {
    return null
  }
}

async function loadRoot(): Promise<RtdbData> {
  if (cache) return cache
  if (cachePromise) return cachePromise
  cachePromise = (async () => {
    const [catalogo, promociones, combos, themes, settings, coupons, content, orders] = await Promise.all([
      readNode('catalogo'),
      readNode('promociones'),
      readNode('combos'),
      readNode('themes'),
      readNode('settings'),
      readNode('coupons'),
      readNode('content'),
      readNode('orders'),
    ])
    cache = {
      catalogo,
      promociones,
      combos,
      themes,
      settings,
      coupons,
      content,
      orders,
    }
    return cache
  })()
  try {
    return await cachePromise
  } finally {
    cachePromise = null
  }
}

export function hashId(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0 || 1
}

function parsePercent(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(100, value))
  if (typeof value === 'string') {
    const m = value.match(/(\d+(?:\.\d+)?)/)
    if (m) return Math.max(0, Math.min(100, Number(m[1]) || 0))
  }
  return 0
}

function parsePrice(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function normalizeCategoryTags(raw: unknown): string[] {
  if (!raw) return []
  return String(raw)
    .toLowerCase()
    .split(/[,\s/|]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function mapCategory(tags: string[], isCombo: boolean, isAdult: boolean): Category {
  if (isAdult) return 'AdultPlus'
  if (tags.includes('ia')) return 'IA'
  if (tags.includes('edicion') || tags.includes('edición')) return 'Edicion'
  if (tags.includes('escolar')) return 'Escolar'
  if (tags.includes('musica') || tags.includes('música')) return 'Musica'
  if (tags.includes('deportes')) return 'Deportes'
  if (tags.includes('lifelong') || tags.includes('siempre') || tags.includes('permanente')) return 'Lifelong'
  if (tags.includes('video')) return 'Video'
  if (isCombo) return 'Lifelong'
  return 'Video'
}

function durationFromTipo(tipo: unknown): number {
  const t = String(tipo ?? '').toLowerCase()
  if (t.includes('anual') || t.includes('año') || t.includes('ano')) return 12
  if (t.includes('permanente') || t.includes('siempre') || t.includes('vital')) return 12
  return 1
}

function toBoolFeatured(tags: string[]): boolean {
  return tags.includes('destacado') || tags.includes('featured')
}

interface FlatProduct extends Product {
  _platform: string
  _plan: string
  _isCombo: boolean
}

function buildProducts(root: RtdbData): FlatProduct[] {
  const catalogo = (root.catalogo ?? {}) as Record<string, any>
  const out: FlatProduct[] = []
  const seen = new Set<number>()

  for (const [platformKey, platformVal] of Object.entries(catalogo)) {
    if (!platformVal || typeof platformVal !== 'object') continue
    const recursos = (platformVal.recursos ?? {}) as Record<string, any>
    const platformImage = String(recursos.imagen ?? recursos.imagen_fondo ?? '')

    for (const [planKey, planVal] of Object.entries(platformVal as Record<string, any>)) {
      if (planKey === 'recursos' || !planVal || typeof planVal !== 'object') continue
      const info = (planVal.info ?? planVal) as Record<string, any>
      const cal = planVal.calificacion
      const hasPrice = info.precio !== undefined || info.plan !== undefined || info.nombre !== undefined
      if (!hasPrice) continue

      const tags = normalizeCategoryTags(info.categoria)
      const isAdult = tags.includes('+18') || tags.includes('adulto') || tags.includes('adult')
      const isCombo = tags.includes('combo') || tags.includes('combos') || Array.isArray(info.plataformas_combo)
      const category = mapCategory(tags, isCombo, isAdult)

      const precio = parsePrice(info.precio)
      const discountPercent = parsePercent(info.descuento)
      const basePrice = precio > 0 ? precio : 0
      const finalPrice = round2(basePrice * (1 - discountPercent / 100))

      const rawId = `${platformKey}::${planKey}`
      let id = hashId(rawId)
      while (seen.has(id)) id = id + 1
      seen.add(id)

      const name = String(info.plan || info.nombre || planKey).trim() || planKey
      const imageUrl = String(info.portada_individual || recursos.imagen || recursos.imagen_fondo || platformImage || '')
      const durationMonths = durationFromTipo(info.tipo)
      const isFeatured = toBoolFeatured(tags) || Boolean(cal)

      out.push({
        id,
        name,
        category,
        basePrice,
        finalPrice,
        discountPercent,
        durationMonths,
        imageUrl,
        isActive: planVal.activa !== undefined ? Boolean(planVal.activa) : true,
        isAdultOnly: isAdult,
        isFeatured,
        createdAt: new Date(0).toISOString(),
        _platform: platformKey,
        _plan: planKey,
        _isCombo: isCombo,
      })
    }
  }
  return out
}

async function getAllProducts(): Promise<FlatProduct[]> {
  const root = await loadRoot()
  return buildProducts(root)
}

export async function rtdbGetProducts(query: { search?: string; category?: Category } = {}): Promise<Product[]> {
  const items = await getAllProducts()
  const term = query.search?.trim().toLowerCase()
  const filtered = items
    .filter((p) => !query.category || p.category === query.category)
    .filter((p) => !term || p.name.toLowerCase().includes(term))
    .sort((a, b) => b.id - a.id)
  const paged = filtered.map(({ _platform, _plan, _isCombo, ...p }) => p)
  return paged
}

export async function rtdbGetBanners(): Promise<Banner[]> {
  const root = await loadRoot()
  const promos = (root.promociones ?? {}) as Record<string, any>
  const destacado = (promos.destacado ?? promos) as Record<string, any>
  const banners: Banner[] = []
  for (const [key, val] of Object.entries(destacado)) {
    if (!val || typeof val !== 'object') continue
    const v = val as Record<string, any>
    if (!v.titulo && !v.imagen && !v.descripcion) continue
    const expiryDate = v.fecha_limite ? String(v.fecha_limite) : null
    const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false
    bannerKeys.set(hashId(`banner:${key}`), key)
    banners.push({
      id: hashId(`banner:${key}`),
      title: String(v.titulo ?? 'Promoción Eclipse'),
      description: String(v.descripcion ?? ''),
      discountText: String(v.descuento ?? ''),
      expiryDate,
      isActive: !isExpired,
      imageUrl: String(v.imagen_fondo || v.imagen || ''),
      ctaText: String(v.cta_text ?? 'Ver más'),
      ctaUrl: String(v.cta_url ?? '#/'),
      sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : 0,
      isExpired,
    })
  }
  banners.sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id)
  return banners.filter((b) => b.isActive && !b.isExpired)
}

export async function rtdbGetCombos(): Promise<Combo[]> {
  const root = await loadRoot()
  const combosNode = (root.combos ?? null) as Record<string, any> | null
  const items: Combo[] = []
  if (combosNode && typeof combosNode === 'object') {
    for (const [key, val] of Object.entries(combosNode)) {
      if (!val || typeof val !== 'object') continue
      const v = val as Record<string, any>
      items.push({
        id: hashId(`combo:${String(v.nombre ?? v.name ?? key)}`),
        name: String(v.nombre ?? v.name ?? key),
        description: String(v.descripcion ?? v.description ?? ''),
        minProfiles: Number(v.minProfiles ?? v.perfiles ?? 2),
        discountPercent: Number(v.descuento ?? v.discountPercent ?? 0),
        isActive: Boolean(v.activo ?? v.isActive ?? true),
        createdAt: String(v.createdAt ?? new Date(0).toISOString()),
      })
    }
  }
  if (items.length === 0) {
    // Fallback: niveles de descuento por perfiles (mismo catálogo que la tienda).
    return [
      { id: 1, name: 'Dúo', description: '2 perfiles', minProfiles: 2, discountPercent: 5, isActive: true, createdAt: new Date(0).toISOString() },
      { id: 2, name: 'Trío', description: '3 perfiles', minProfiles: 3, discountPercent: 8, isActive: true, createdAt: new Date(0).toISOString() },
      { id: 3, name: 'Familiar', description: '4 perfiles', minProfiles: 4, discountPercent: 12, isActive: true, createdAt: new Date(0).toISOString() },
      { id: 4, name: 'Max', description: '6 perfiles', minProfiles: 6, discountPercent: 15, isActive: true, createdAt: new Date(0).toISOString() },
      { id: 5, name: 'Ultra', description: '8 perfiles', minProfiles: 8, discountPercent: 18, isActive: true, createdAt: new Date(0).toISOString() },
    ]
  }
  return items
}

export async function rtdbGetTheme(): Promise<ThemeResponse> {
  const root = await loadRoot()
  const themesNode = (root.themes ?? null) as Record<string, any> | null
  const themes: Theme[] = []
  if (themesNode && typeof themesNode === 'object') {
    for (const [key, val] of Object.entries(themesNode)) {
      if (!val || typeof val !== 'object') continue
      const v = val as Record<string, any>
      themes.push({
        id: hashId(key),
        themeKey: String(v.themeKey ?? key),
        primaryColor: String(v.primaryColor ?? '#8B5CF6'),
        secondaryColor: String(v.secondaryColor ?? '#22D3EE'),
        accentColor: String(v.accentColor ?? '#FBBF24'),
        backgroundColor: String(v.backgroundColor ?? '#06060D'),
        fontStyle: String(v.fontStyle ?? 'Sora'),
        customCss: String(v.customCss ?? ''),
        isActive: Boolean(v.isActive ?? false),
        updatedAt: String(v.updatedAt ?? ''),
      })
    }
  }
  const active = themes.find((t) => t.isActive) ?? themes[0] ?? {
    id: 1,
    themeKey: 'base',
    primaryColor: '#8B5CF6',
    secondaryColor: '#22D3EE',
    accentColor: '#FBBF24',
    backgroundColor: '#06060D',
    fontStyle: 'Sora',
    customCss: '',
    isActive: true,
    updatedAt: new Date(0).toISOString(),
  }
  return { active, themes }
}

export async function rtdbGetSettings(): Promise<PaymentSettings> {
  const root = await loadRoot()
  const settingsNode = (root.settings ?? null) as Record<string, any> | null
  const data = (settingsNode && typeof settingsNode === 'object' ? settingsNode : {}) as Record<string, any>
  return {
    id: 1,
    bankName: String(data.bankName ?? 'BBVA México'),
    beneficiary: String(data.beneficiary ?? 'Eclipse Digital'),
    clabeNumber: String(data.clabeNumber ?? '012180000000000000'),
    mercadoPagoClabe: String(data.mercadoPagoClabe ?? '722969000000000000'),
    oxxoReference: String(data.oxxoReference ?? 'ECLIPSE'),
    whatsAppNumber: String(data.whatsAppNumber ?? '5219971946172'),
    supportEmail: String(data.supportEmail ?? 'soporte@eclipse.digital'),
    paymentNote: String(data.paymentNote ?? 'Realiza tu pago y envía tu comprobante por WhatsApp con tu número de pedido para validar tu compra.'),
    updatedAt: String(data.updatedAt ?? new Date(0).toISOString()),
  }
}

export async function rtdbValidateCoupon(code: string): Promise<CouponValidation> {
  const normalized = code.trim().toUpperCase()
  const root = await loadRoot()
  const couponsNode = (root.coupons ?? null) as Record<string, any> | null
  const coupons = (couponsNode && typeof couponsNode === 'object' ? couponsNode : {}) as Record<string, any>
  const coupon = Object.values(coupons).find(
    (c) => c && typeof c === 'object' && String((c as Record<string, any>).code ?? '').toUpperCase() === normalized,
  )
  if (!coupon) {
    return { valid: false, code: normalized, discountPercent: 0, message: 'El cupón no es válido o no está disponible por ahora.' }
  }
  const c = coupon as Record<string, any>
  const discountPercent = Number(c.descuento ?? c.discountPercent ?? 0)
  const isActive = Boolean(c.activo ?? c.isActive ?? true)
  const expiryDate = c.fecha_expiracion || c.expiryDate ? String(c.fecha_expiracion ?? c.expiryDate) : null
  const expired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false
  const valid = isActive && !expired && discountPercent > 0
  return {
    valid,
    code: normalized,
    discountPercent: valid ? discountPercent : 0,
    message: valid ? `Cupón aplicado: ${discountPercent}% de descuento.` : 'El cupón no es válido, inactivo o ya expiró.',
  }
}

export async function rtdbGetCoupons(): Promise<Coupon[]> {
  const root = await loadRoot()
  const couponsNode = (root.coupons ?? null) as Record<string, any> | null
  const items: Coupon[] = []
  if (couponsNode && typeof couponsNode === 'object') {
    for (const [key, val] of Object.entries(couponsNode)) {
      if (!val || typeof val !== 'object') continue
      const c = val as Record<string, any>
      const code = String(c.code ?? key).toUpperCase()
      const discountPercent = Number(c.descuento ?? c.discountPercent ?? 0)
      const maxUses = Number(c.maxUses ?? c.usosMaximos ?? 0)
      const usedCount = Number(c.usedCount ?? c.usosUsados ?? 0)
      const expiryDate = c.fecha_expiracion || c.expiryDate ? String(c.fecha_expiracion ?? c.expiryDate) : null
      const isActive = Boolean(c.activo ?? c.isActive ?? true)
      const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false
      items.push({
        id: hashId(`coupon:${code}`),
        code,
        discountPercent,
        maxUses,
        usedCount,
        expiryDate,
        isActive,
        createdAt: String(c.createdAt ?? new Date(0).toISOString()),
        isExpired,
        remainingUses: maxUses > 0 ? Math.max(0, maxUses - usedCount) : 999,
      })
    }
  }
  return items.sort((a, b) => a.code.localeCompare(b.code))
}

export async function rtdbSaveCoupon(code: string, data: object): Promise<void> {
  await set(ref(rtdb, `coupons/${code}`), { ...data, code })
}

export async function rtdbRemoveCouponById(id: number): Promise<void> {
  const items = await rtdbGetCoupons()
  const coupon = items.find((c) => c.id === id)
  if (coupon) {
    await remove(ref(rtdb, `coupons/${coupon.code}`))
  }
}

export async function rtdbGetContent(): Promise<{ site: SiteContent; news: NewsItem[] }> {
  const root = await loadRoot()
  const contentNode = (root.content ?? null) as Record<string, any> | null
  const site: SiteContent = {
    id: 1,
    heroImageUrl: String(contentNode?.heroImageUrl ?? ''),
    heroTitle: String(contentNode?.heroTitle ?? ''),
    heroDescription: String(contentNode?.heroDescription ?? ''),
    updatedAt: String(contentNode?.updatedAt ?? new Date(0).toISOString()),
  }
  const news: NewsItem[] = []
  const newsNode = (root.news ?? null) as Record<string, any> | null
  if (newsNode && typeof newsNode === 'object') {
    for (const [key, val] of Object.entries(newsNode)) {
      if (!val || typeof val !== 'object') continue
      const n = val as Record<string, any>
      news.push({
        id: hashId(`news:${key}`),
        slug: String(n.slug ?? key),
        title: String(n.titulo ?? n.title ?? key),
        date: String(n.fecha ?? n.date ?? ''),
        excerpt: String(n.resumen ?? n.excerpt ?? ''),
        imageUrl: String(n.imagen ?? n.imageUrl ?? ''),
        body: Array.isArray(n.cuerpo) ? n.cuerpo.map((p: unknown) => String(p)) : [String(n.cuerpo ?? n.body ?? '')],
        createdAt: String(n.createdAt ?? new Date(0).toISOString()),
      })
    }
  }
  return { site, news }
}

export async function rtdbGetOrders(): Promise<PagedResult<Order>> {
  const root = await loadRoot()
  const ordersNode = (root.orders ?? null) as Record<string, any> | null
  const orders: Order[] = []
  if (ordersNode && typeof ordersNode === 'object') {
    for (const [key, val] of Object.entries(ordersNode)) {
      if (!val || typeof val !== 'object') continue
      const o = val as Record<string, any>
      orders.push({
        id: hashId(`order:${key}`),
        orderNumber: String(o.numero ?? o.orderNumber ?? `ECL-${key}`),
        customerName: String(o.cliente ?? o.customerName ?? ''),
        customerEmail: o.email ? String(o.email) : null,
        customerPhone: o.telefono ? String(o.telefono) : null,
        subtotal: Number(o.subtotal ?? 0),
        discountAmount: Number(o.descuento ?? o.discountAmount ?? 0),
        totalAmount: Number(o.total ?? o.totalAmount ?? 0),
        paymentMethod: (o.metodoPago ?? o.paymentMethod ?? 'BBVA') as Order['paymentMethod'],
        status: (o.estado ?? o.status ?? 'Pending') as OrderStatus,
        couponCode: o.cupon ? String(o.cupon) : null,
        notes: o.notas ? String(o.notas) : null,
        items: [],
        createdAt: String(o.creadoEn ?? o.createdAt ?? new Date(0).toISOString()),
        verifiedAt: o.verificadoEn ? String(o.verificadoEn) : null,
      })
    }
  }
  return { items: orders.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), page: 1, pageSize: 20, total: orders.length, totalPages: 1 }
}

// ---------------------------------------------------------------------------
// Escrituras en RTDB
// ---------------------------------------------------------------------------
export async function rtdbSaveBanner(key: string, data: object): Promise<void> {
  await set(ref(rtdb, `promociones/destacado/${key}`), data)
}

export async function rtdbRemoveBanner(key: string): Promise<void> {
  await remove(ref(rtdb, `promociones/destacado/${key}`))
}

export async function rtdbSaveProduct(platform: string, plan: string, data: object): Promise<void> {
  await set(ref(rtdb, `catalogo/${platform}/${plan}`), data)
}

export async function rtdbRemoveProduct(platform: string, plan: string): Promise<void> {
  await remove(ref(rtdb, `catalogo/${platform}/${plan}`))
}

export async function rtdbRemoveProductById(id: number): Promise<void> {
  const items = await getAllProducts()
  const product = items.find((p) => p.id === id)
  if (product) {
    await remove(ref(rtdb, `catalogo/${product._platform}/${product._plan}`))
  }
}

export async function rtdbSaveProductFor(input: ProductInput): Promise<Product> {
  const platform = String(input.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'admin'
  const plan = `plan-${Date.now()}`
  const data: Record<string, unknown> = {
    info: {
      plan: input.name,
      nombre: input.name,
      precio: input.basePrice,
      descuento: input.discountPercent,
      tipo: input.durationMonths >= 12 ? 'Anual' : input.durationMonths >= 6 ? 'Semestral' : 'Mensual',
      categoria: [String(input.category ?? '').toLowerCase()],
    },
    recursos: { imagen: input.imageUrl },
  }
  await rtdbSaveProduct(platform, plan, data)
  const finalPrice = round2(input.basePrice * (1 - input.discountPercent / 100))
  return {
    id: hashId(`${platform}::${plan}`),
    name: input.name,
    category: input.category,
    basePrice: input.basePrice,
    finalPrice,
    discountPercent: input.discountPercent,
    durationMonths: input.durationMonths,
    imageUrl: input.imageUrl,
    isActive: input.isActive,
    isAdultOnly: input.isAdultOnly,
    isFeatured: input.isFeatured,
    createdAt: new Date(0).toISOString(),
  }
}

export async function rtdbUpdateProduct(id: number, payload: ProductInput): Promise<Product> {
  const items = await getAllProducts()
  const product = items.find((p) => p.id === id)
  if (!product) throw new Error('Producto no encontrado.')
  const info: Record<string, unknown> = {
    plan: payload.name,
    nombre: payload.name,
    precio: payload.basePrice,
    descuento: payload.discountPercent,
    tipo: payload.durationMonths >= 12 ? 'Anual' : payload.durationMonths >= 6 ? 'Semestral' : 'Mensual',
    categoria: [String(payload.category ?? '').toLowerCase()],
  }
  await set(ref(rtdb, `catalogo/${product._platform}/${product._plan}`), { info, recursos: { imagen: payload.imageUrl }, actualizadoEn: new Date().toISOString() })
  const finalPrice = round2(payload.basePrice * (1 - payload.discountPercent / 100))
  return {
    id: product.id,
    name: payload.name,
    category: payload.category,
    basePrice: payload.basePrice,
    finalPrice,
    discountPercent: payload.discountPercent,
    durationMonths: payload.durationMonths,
    imageUrl: payload.imageUrl,
    isActive: payload.isActive,
    isAdultOnly: payload.isAdultOnly,
    isFeatured: payload.isFeatured,
    createdAt: product.createdAt,
  }
}

export async function rtdbToggleProduct(id: number, isActive: boolean): Promise<void> {
  const items = await getAllProducts()
  const product = items.find((p) => p.id === id)
  if (!product) throw new Error('Producto no encontrado.')
  // Flag `activa` a nivel hoja: no pisa el resto de la información del plan.
  await set(ref(rtdb, `catalogo/${product._platform}/${product._plan}/activa`), isActive)
}

export async function rtdbSaveCombo(id: number, data: object): Promise<void> {
  await set(ref(rtdb, `combos/${id}`), data)
}

export async function rtdbRemoveCombo(id: number): Promise<void> {
  await remove(ref(rtdb, `combos/${id}`))
}

export async function rtdbSaveTheme(themeKey: string, data: object): Promise<void> {
  await set(ref(rtdb, `themes/${themeKey}`), data)
}

export async function rtdbSaveSettings(payload: PaymentSettingsInput): Promise<void> {
  await set(ref(rtdb, 'settings/main'), { ...payload, updatedAt: new Date().toISOString() })
}

export async function rtdbSaveContent(payload: SiteContentInput): Promise<void> {
  await set(ref(rtdb, 'content/hero'), { ...payload, updatedAt: new Date().toISOString() })
}

export async function rtdbSaveNews(item: NewsItem): Promise<void> {
  await set(ref(rtdb, `content/news/${item.slug}`), item)
}

export async function rtdbRemoveNews(slug: string): Promise<void> {
  await remove(ref(rtdb, `content/news/${slug}`))
}

export async function rtdbUpdateOrder(id: number, status: OrderStatus): Promise<void> {
  await set(ref(rtdb, `orders/${id}`), { estado: status, actualizadoEn: new Date().toISOString() })
}
