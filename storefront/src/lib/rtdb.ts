import { get, ref, update } from 'firebase/database'
import { rtdb } from './firebase'
import { buildWhatsAppLink, formatCurrency, round2 } from './pricing'
import type {
  Banner,
  Category,
  Combo,
  CouponValidation,
  CreateOrderPayload,
  NewsItem,
  OrderConfirmation,
  OrderItemSnapshot,
  PagedResult,
  PaymentSettings,
  Product,
  ProductQuery,
  SiteContent,
  Theme,
  ThemeResponse,
} from '../types'

type RtdbData = Record<string, unknown>

let cache: RtdbData | null = null
let cachePromise: Promise<RtdbData> | null = null

async function readNode(path: string): Promise<unknown> {
  try {
    const snap = await get(ref(rtdb, path))
    return snap.exists() ? snap.val() : null
  } catch {
    // Nodo no legible con las reglas actuales o inexistente: continuar sin bloquear.
    return null
  }
}

async function loadRoot(): Promise<RtdbData> {
  if (cache) return cache
  if (cachePromise) return cachePromise
  cachePromise = (async () => {
    // Leer solo los nodos permitidos por las reglas (catalogo/promociones son públicos).
    // Evitamos leer la raíz completa porque hay nodos restringidos a auth.
    const [catalogo, promociones] = await Promise.all([
      readNode('catalogo'),
      readNode('promociones'),
    ])
    cache = {
      ...(catalogo ? { catalogo } : {}),
      ...(promociones ? { promociones } : {}),
    }
    return cache
  })()
  try {
    return await cachePromise
  } finally {
    cachePromise = null
  }
}

function hashId(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) || 1
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
      // skip non-plan nodes without info-like fields
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
        isActive: true,
        isAdultOnly: isAdult,
        isFeatured,
        createdAt: new Date(0).toISOString(),
        _platform: platformKey,
        _isCombo: isCombo,
      })
    }
  }
  return out
}

let productsCache: FlatProduct[] | null = null
async function getAllProducts(): Promise<FlatProduct[]> {
  if (productsCache) return productsCache
  const root = await loadRoot()
  productsCache = buildProducts(root)
  return productsCache
}

function matchesSearch(product: Product, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return product.name.toLowerCase().includes(q)
}

export async function rtdbGetProducts(query: ProductQuery = {}): Promise<PagedResult<Product>> {
  let items = await getAllProducts()

  if (!query.includeAdult) items = items.filter((p) => !p.isAdultOnly)
  if (query.category) items = items.filter((p) => p.category === query.category)
  if (query.search) items = items.filter((p) => matchesSearch(p, query.search!))
  if (query.featured) items = items.filter((p) => p.isFeatured)
  if (query.minPrice !== undefined) items = items.filter((p) => p.finalPrice >= query.minPrice!)
  if (query.maxPrice !== undefined) items = items.filter((p) => p.finalPrice <= query.maxPrice!)

  const sort = query.sort || 'newest'
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

  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 12))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const paged = items.slice(start, start + pageSize).map(({ _platform, _isCombo, ...p }) => p)

  return { items: paged, page, pageSize, total, totalPages }
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
    banners.push({
      id: hashId(`banner:${key}`),
      title: String(v.titulo ?? 'Promoción Eclipse'),
      description: String(v.descripcion ?? ''),
      discountText: String(v.descuento ?? ''),
      expiryDate,
      isActive: (v.activo ?? true) && !isExpired,
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

export async function rtdbGetSettings(): Promise<PaymentSettings> {
  const [main, legacy] = await Promise.all([readNode('settings/main'), readNode('settings')])
  const raw = (main ?? legacy ?? {}) as Record<string, any>
  const data = (raw.main ?? raw) as Record<string, any>
  return {
    id: 1,
    companyName: String(data.companyName ?? 'Eclipse Tech'),
    logoUrl: String(data.logoUrl ?? ''),
    studentDiscountPercent: Math.max(0, Math.min(100, Number(data.studentDiscountPercent ?? 0))),
    bankName: String(data.bankName ?? 'BBVA México'),
    beneficiary: String(data.beneficiary ?? 'Eclipse Digital'),
    clabeNumber: String(data.clabeNumber ?? '012180000000000000'),
    mercadoPagoClabe: String(data.mercadoPagoClabe ?? '722969000000000000'),
    oxxoReference: String(data.oxxoReference ?? 'ECLIPSE'),
    whatsAppNumber: String(data.whatsAppNumber ?? '5219971946172'),
    supportEmail: String(data.supportEmail ?? 'soporte@eclipse.digital'),
    paymentNote: String(data.paymentNote ?? 'Realiza tu pago y envía tu comprobante por WhatsApp con tu número de pedido para validar tu compra.'),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  }
}

export async function rtdbGetCombos(): Promise<Combo[]> {
  const node = (await readNode('combos')) as Record<string, any> | null
  const items: Combo[] = []
  if (node && typeof node === 'object') {
    for (const [key, val] of Object.entries(node)) {
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
  if (items.length > 0) {
    return items.sort((a, b) => a.minProfiles - b.minProfiles)
  }
  // Progressive discount tiers for ComboBuilder (fallback definido en código).
  return [
    { id: 1, name: 'Dúo', description: '2 perfiles', minProfiles: 2, discountPercent: 5, isActive: true, createdAt: new Date(0).toISOString() },
    { id: 2, name: 'Trío', description: '3 perfiles', minProfiles: 3, discountPercent: 8, isActive: true, createdAt: new Date(0).toISOString() },
    { id: 3, name: 'Familiar', description: '4 perfiles', minProfiles: 4, discountPercent: 12, isActive: true, createdAt: new Date(0).toISOString() },
    { id: 4, name: 'Max', description: '6 perfiles', minProfiles: 6, discountPercent: 15, isActive: true, createdAt: new Date(0).toISOString() },
    { id: 5, name: 'Ultra', description: '8 perfiles', minProfiles: 8, discountPercent: 18, isActive: true, createdAt: new Date(0).toISOString() },
  ]
}

export async function rtdbGetContent(): Promise<{ site: SiteContent; news: NewsItem[] }> {
  const [hero, newsNode] = await Promise.all([readNode('content/hero'), readNode('content/news')])
  const data = (hero && typeof hero === 'object' ? hero : {}) as Record<string, any>

  const site: SiteContent = {
    heroImageUrl: String(data.heroImageUrl ?? ''),
    heroTitle: String(data.heroTitle ?? ''),
    heroDescription: String(data.heroDescription ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  }

  const news: NewsItem[] = []
  if (newsNode && typeof newsNode === 'object') {
    for (const [key, value] of Object.entries(newsNode)) {
      if (!value || typeof value !== 'object') continue
      const item = value as Record<string, any>
      news.push({
        id: hashId(`news:${key}`),
        slug: String(item.slug ?? key),
        title: String(item.title ?? item.titulo ?? key),
        date: String(item.date ?? item.fecha ?? ''),
        excerpt: String(item.excerpt ?? item.resumen ?? ''),
        imageUrl: String(item.imageUrl ?? item.imagen ?? ''),
        body: Array.isArray(item.body)
          ? item.body.map((paragraph: unknown) => String(paragraph))
          : [String(item.body ?? item.cuerpo ?? '')],
        createdAt: String(item.createdAt ?? new Date(0).toISOString()),
      })
    }
  }

  return { site, news: news.sort((a, b) => +new Date(b.date) - +new Date(a.date)) }
}

export async function rtdbGetTheme(): Promise<ThemeResponse> {
  const node = (await readNode('themes')) as Record<string, any> | null
  const themes: Theme[] = []

  if (node && typeof node === 'object') {
    for (const [key, val] of Object.entries(node)) {
      if (!val || typeof val !== 'object') continue
      const v = val as Record<string, any>
      themes.push({
        id: hashId(`theme:${key}`),
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

  const fallback: Theme = {
    id: 1,
    themeKey: 'base',
    primaryColor: '#8B5CF6',
    secondaryColor: '#22D3EE',
    accentColor: '#FBBF24',
    backgroundColor: '#06060D',
    fontStyle: 'Sora',
    customCss: '',
    isActive: true,
    updatedAt: new Date().toISOString(),
  }

  const active = themes.find((theme) => theme.isActive) ?? themes[0] ?? fallback
  return { active, themes: themes.length > 0 ? themes : [fallback] }
}

export async function rtdbValidateCoupon(code: string): Promise<CouponValidation> {
  const normalized = code.trim().toUpperCase()
  const node = (await readNode('coupons')) as Record<string, any> | null
  const list = node && typeof node === 'object' ? Object.values(node) : []
  const coupon = list.find(
    (item) => item && typeof item === 'object' && String((item as Record<string, any>).code ?? '').toUpperCase() === normalized,
  ) as Record<string, any> | undefined
  if (!coupon) {
    return {
      valid: false,
      code: normalized,
      discountPercent: 0,
      message: 'El cupón no es válido o no está disponible por ahora.',
    }
  }
  const discountPercent = Number(coupon.discountPercent ?? coupon.descuento ?? 0)
  const isActive = Boolean(coupon.isActive ?? coupon.activo ?? true)
  const expiryRaw = coupon.expiryDate ?? coupon.fecha_expiracion ?? null
  const expired = expiryRaw ? new Date(String(expiryRaw)).getTime() < Date.now() : false
  const maxUses = Number(coupon.maxUses ?? coupon.usosMaximos ?? 0)
  const usedCount = Number(coupon.usedCount ?? coupon.usosUsados ?? 0)
  const exhausted = maxUses > 0 && usedCount >= maxUses
  const valid = isActive && !expired && !exhausted && discountPercent > 0
  return {
    valid,
    code: normalized,
    discountPercent: valid ? discountPercent : 0,
    message: valid
      ? `Cupón aplicado: ${discountPercent}% de descuento.`
      : 'El cupón no es válido, inactivo, agotado o ya expiró.',
  }
}

function buildSnapshots(payload: CreateOrderPayload, products: FlatProduct[], combos: Combo[]): { snapshots: OrderItemSnapshot[]; subtotal: number } {
  const byId = new Map(products.map((p) => [p.id, p]))
  const snapshots: OrderItemSnapshot[] = []
  let subtotal = 0

  for (const item of payload.items) {
    if (item.productId) {
      const p = byId.get(item.productId)
      if (!p) continue
      const months = item.durationMonths || 1
      const mult = months === 12 ? 9.6 : months === 6 ? 5.1 : months === 3 ? 2.7 : 1
      const originalUnit = round2(p.basePrice * mult)
      const unit = round2(originalUnit * (1 - p.discountPercent / 100))
      const lineTotal = round2(unit * item.quantity)
      subtotal += lineTotal
      snapshots.push({
        name: p.name,
        category: p.category,
        productId: p.id,
        productIds: null,
        durationMonths: months,
        quantity: item.quantity,
        originalUnitPrice: originalUnit,
        unitPrice: unit,
        lineTotal,
        comboDiscountPercent: 0,
        imageUrl: p.imageUrl,
        isAdultOnly: p.isAdultOnly,
      })
    } else if (item.productIds && item.productIds.length) {
      const prods = item.productIds.map((id) => byId.get(id)).filter(Boolean) as FlatProduct[]
      if (!prods.length) continue
      const months = item.durationMonths || 1
      const mult = months === 12 ? 9.6 : months === 6 ? 5.1 : months === 3 ? 2.7 : 1
      const original = round2(prods.reduce((s, p) => s + round2(p.basePrice * mult * (1 - p.discountPercent / 100)), 0))
      const tier = combos.filter((c) => c.isActive && c.minProfiles <= prods.length).sort((a, b) => a.minProfiles - b.minProfiles).at(-1)
      const comboDisc = tier?.discountPercent ?? 0
      const unit = round2(original * (1 - comboDisc / 100))
      const lineTotal = round2(unit * item.quantity)
      subtotal += lineTotal
      snapshots.push({
        name: `Combo: ${prods.map((p) => p.name).join(', ')}`,
        category: 'Combo',
        productId: null,
        productIds: prods.map((p) => p.id),
        durationMonths: months,
        quantity: item.quantity,
        originalUnitPrice: original,
        unitPrice: unit,
        lineTotal,
        comboDiscountPercent: comboDisc,
        imageUrl: prods[0]?.imageUrl || '',
        isAdultOnly: prods.some((p) => p.isAdultOnly),
      })
    }
  }
  return { snapshots, subtotal: round2(subtotal) }
}

export async function rtdbCreateOrder(payload: CreateOrderPayload): Promise<OrderConfirmation> {
  const [products, combos, settings] = await Promise.all([getAllProducts(), rtdbGetCombos(), rtdbGetSettings()])
  const { snapshots, subtotal } = buildSnapshots(payload, products, combos)

  // El total confirmado debe coincidir con lo que vio el cliente: cupón + descuento
  // de estudiante aprobado. Ambos porcentajes se suman y se limitan al 100%.
  const couponPercent = payload.couponCode
    ? (await rtdbValidateCoupon(payload.couponCode)).discountPercent
    : 0
  const studentPercent = Math.max(0, Math.min(100, Number(payload.studentDiscountPercent ?? 0)))
  const discountPercent = Math.min(100, couponPercent + studentPercent)
  const discountAmount = round2((subtotal * discountPercent) / 100)
  const totalAmount = round2(Math.max(0, subtotal - discountAmount))
  const orderId = Math.floor(Date.now() / 1000)
  const orderNumber = `ECL-${String(orderId).slice(-8)}`
  const createdAt = new Date().toISOString()
  const summary = snapshots.map((s) => `• ${s.name} x${s.quantity} (${s.durationMonths}m) - ${formatCurrency(s.lineTotal)}`).join('\n')
  const message = `Hola, quiero confirmar mi pedido ${orderNumber}.\nNombre: ${payload.customerName}\nTotal: ${formatCurrency(totalAmount)}\nPago: ${payload.paymentMethod}\n\n${summary}`
  const whatsAppUrl = buildWhatsAppLink(settings.whatsAppNumber, message)

  return {
    orderId,
    orderNumber,
    customerName: payload.customerName,
    subtotal,
    discountAmount,
    totalAmount,
    paymentMethod: payload.paymentMethod,
    items: snapshots,
    settings,
    whatsAppUrl,
    createdAt,
  }
}

// ---------------------------------------------------------------------------
// Nodos legacy que ahora también usa la tienda: opiniones y códigos/cuentas.
// ---------------------------------------------------------------------------

export interface RtdbOpinion {
  id: string
  nombre: string
  estrellas: number
  comentario: string
  createdAt: string
}

export interface RtdbCustomerAsset {
  key: string
  node: string
  titulo: string
  valor: string
  plataforma: string
  vigenciaDesde: string
  vigenciaHasta: string
}

function toList(raw: unknown): Array<[string, Record<string, any>]> {
  if (!raw || typeof raw !== 'object') return []
  const entries = Array.isArray(raw)
    ? raw.map((value, index) => [String(index), value] as [string, Record<string, any>])
    : Object.entries(raw as Record<string, any>)
  return entries.filter(([, value]) => value && typeof value === 'object')
}

export async function rtdbGetOpiniones(): Promise<RtdbOpinion[]> {
  const raw = await readNode('opiniones')
  return toList(raw)
    .map(([key, value]) => ({
      id: key,
      nombre: String(value.nombre ?? value.name ?? value.usuario ?? value.displayName ?? 'Cliente'),
      estrellas: Math.max(1, Math.min(5, Number(value.estrellas ?? value.rating ?? value.calificacion ?? 5))),
      comentario: String(value.comentario ?? value.texto ?? value.opinion ?? value.comentarios ?? ''),
      createdAt: String(value.createdAt ?? value.fecha ?? new Date(0).toISOString()),
    }))
    .filter((item) => item.comentario.trim().length > 0)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

export async function rtdbSubmitOpinion(input: {
  uid: string
  nombre: string
  email: string
  estrellas: number
  comentario: string
}): Promise<void> {
  await update(ref(rtdb, `opiniones/${input.uid}`), {
    nombre: input.nombre,
    email: input.email,
    estrellas: input.estrellas,
    comentario: input.comentario.trim(),
    createdAt: new Date().toISOString(),
  })
}

/** Lee los códigos/cuentas asignados al cliente, en cualquiera de los nodos legacy. */
export async function rtdbGetCustomerAssets(uid: string, email: string): Promise<RtdbCustomerAsset[]> {
  const nodes = ['codigos_streaming', 'códigos_streaming', 'cuentas de streaming', 'cuentas']
  const found: RtdbCustomerAsset[] = []
  const uidLower = uid.toLowerCase()
  const emailLower = email.trim().toLowerCase()

  for (const node of nodes) {
    const raw = await readNode(node)
    for (const [key, value] of toList(raw)) {
      const text = JSON.stringify(value).toLowerCase()
      if (!text.includes(uidLower) && (!emailLower || !text.includes(emailLower))) continue

      found.push({
        key,
        node,
        titulo: String(value.titulo ?? value.plataforma ?? value.platform ?? value.nombre ?? value.producto ?? key),
        valor: String(
          value.codigo ?? value.codigo_streaming ?? value.code ?? value.cuenta ?? value.email ??
            value.usuario ?? value.valor ?? value.perfil ?? '',
        ),
        plataforma: String(value.plataforma ?? value.platform ?? value.servicio ?? ''),
        vigenciaDesde: String(value.vigenciaDesde ?? value.desde ?? value.validFrom ?? value.fecha_inicio ?? ''),
        vigenciaHasta: String(value.vigenciaHasta ?? value.hasta ?? value.validTo ?? value.fecha_fin ?? value.vencimiento ?? ''),
      })
    }
  }

  return found.sort((a, b) => a.titulo.localeCompare(b.titulo))
}