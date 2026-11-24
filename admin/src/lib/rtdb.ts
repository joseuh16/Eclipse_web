// ---------------------------------------------------------------------------
// Capa de datos del panel conectada a Firebase Realtime Database (RTDB).
// Lee los nodos: catalogo, promociones, combos, themes, settings, coupons,
// content, orders — todo con la misma instancia `rtdb` de ./firebase.
// ---------------------------------------------------------------------------
import { get, ref, remove as fbRemove, set as fbSet, update as fbUpdate } from 'firebase/database'
import { rtdb } from './firebase'
import { round2 } from './utils'
import type {
  Banner,
  Category,
  Combo,
  Coupon,
  CouponValidation,
  CustomerProfile,
  DashboardStats,
  DailySales,
  DeliveredAccount,
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
  TopProduct,
} from '../types'
import { THEME_PRESETS } from './themePresets'

type RtdbData = Record<string, unknown>

let cache: RtdbData | null = null
let cacheAt = 0
let cachePromise: Promise<RtdbData> | null = null
const CACHE_TTL_MS = 15_000
export const bannerKeys: Map<number, string> = new Map<number, string>()

/** Fuerza a releer RTDB en la siguiente consulta (tras guardar cambios). */
export function invalidateRtdbCache(): void {
  cache = null
  cacheAt = 0
}

// Escrituras: cada set/update/remove invalida la caché para reflejar los
// cambios de inmediato en el panel.
function writeError(error: unknown): never {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  if (code === 'PERMISSION_DENIED') {
    throw new Error(
      'Firebase rechazó el guardado (permiso denegado). Publica las reglas de database.rules.json en Firebase Console → Realtime Database → Reglas.',
    )
  }
  throw error instanceof Error ? error : new Error('No pudimos guardar los cambios en Firebase.')
}

async function set(target: Parameters<typeof fbSet>[0], value: Parameters<typeof fbSet>[1]): Promise<void> {
  try {
    await fbSet(target, value)
  } catch (error) {
    writeError(error)
  }
  invalidateRtdbCache()
}

async function update(target: Parameters<typeof fbUpdate>[0], value: Parameters<typeof fbUpdate>[1]): Promise<void> {
  try {
    await fbUpdate(target, value)
  } catch (error) {
    writeError(error)
  }
  invalidateRtdbCache()
}

async function remove(target: Parameters<typeof fbRemove>[0]): Promise<void> {
  try {
    await fbRemove(target)
  } catch (error) {
    writeError(error)
  }
  invalidateRtdbCache()
}

export async function readNode(path: string): Promise<unknown> {
  try {
    const snap = await get(ref(rtdb, path))
    return snap.exists() ? snap.val() : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Nodos "huérfanos" administrables desde el panel (Base de datos).
// Se reutiliza readNode para no duplicar la lógica de lectura de RTDB.
// ---------------------------------------------------------------------------
function asDatabaseRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  // Primitivos y arrays se exponen como un único registro raíz editable.
  return raw === null || raw === undefined ? {} : { __root__: raw }
}

export async function rtdbGetDatabaseNode(node: string): Promise<Record<string, unknown>> {
  const raw = await readNode(node)
  const isEmpty =
    raw === null ||
    raw === undefined ||
    (typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw as Record<string, unknown>).length === 0)

  if (node === 'codigos_streaming' && isEmpty) {
    // El nodo también existe con acento en datos legacy.
    const legacy = await readNode('códigos_streaming')
    if (legacy !== null && legacy !== undefined) return asDatabaseRecord(legacy)
  }

  return asDatabaseRecord(raw)
}

export async function rtdbSaveDatabaseRecord(node: string, key: string, value: unknown): Promise<void> {
  if (!node || !key) throw new Error('El nodo y la clave son obligatorios.')
  const target = key === '__root__' ? ref(rtdb, node) : ref(rtdb, `${node}/${key}`)
  if (node === 'usuarios') {
    // Escritura segura: roles conocidos y ningún otro campo.
    const record =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null
    const roles = ['admin', 'empleado', 'cliente', 'normal']
    if (
      !record ||
      Object.keys(record).some((field) => field !== 'rol') ||
      !roles.includes(String(record.rol))
    ) {
      throw new Error('En usuarios solo se permite editar el campo rol (admin, empleado, normal o cliente).')
    }
    await update(target,{rol: String(record.rol)})
    return
  }
  await set(target, value)
}

export async function rtdbRemoveDatabaseRecord(node: string, key: string): Promise<void> {
  if (node === 'usuarios') {
    throw new Error('No se pueden eliminar usuarios desde el panel (incluido tu propio uid).')
  }
  if (!node || !key) throw new Error('El nodo y la clave son obligatorios.')

  const target = key === '__root__' ? ref(rtdb, node) : ref(rtdb, `${node}/${key}`)
  await remove(target)
}

async function loadRoot(): Promise<RtdbData> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache
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
    cacheAt = Date.now()
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

function presetToTheme(preset: (typeof THEME_PRESETS)[number], isActive: boolean): Theme {
  return {
    id: hashId(preset.key),
    themeKey: preset.key,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    accentColor: preset.accentColor,
    backgroundColor: preset.backgroundColor,
    fontStyle: preset.fontStyle,
    customCss: preset.customCss,
    isActive,
    updatedAt: '',
  }
}

export async function rtdbGetTheme(): Promise<ThemeResponse> {
  const root = await loadRoot()
  const themesNode = (root.themes ?? null) as Record<string, any> | null

  // Base: todos los presets de temporada (siempre visibles en el panel).
  const byKey = new Map<string, Theme>()
  THEME_PRESETS.forEach((preset) => {
    byKey.set(preset.key, presetToTheme(preset, false))
  })

  let storedActiveKey = ''
  if (themesNode && typeof themesNode === 'object') {
    for (const [key, val] of Object.entries(themesNode)) {
      if (!val || typeof val !== 'object') continue
      const v = val as Record<string, any>
      const themeKey = String(v.themeKey ?? key)
      if (Boolean(v.isActive) && !storedActiveKey) storedActiveKey = themeKey
      const preset = THEME_PRESETS.find((item) => item.key === themeKey)
      byKey.set(themeKey, {
        id: hashId(themeKey),
        themeKey,
        primaryColor: String(v.primaryColor ?? preset?.primaryColor ?? '#8B5CF6'),
        secondaryColor: String(v.secondaryColor ?? preset?.secondaryColor ?? '#22D3EE'),
        accentColor: String(v.accentColor ?? preset?.accentColor ?? '#FBBF24'),
        backgroundColor: String(v.backgroundColor ?? preset?.backgroundColor ?? '#06060D'),
        fontStyle: String(v.fontStyle ?? preset?.fontStyle ?? 'Sora'),
        customCss: String(v.customCss ?? preset?.customCss ?? ''),
        isActive: Boolean(v.isActive ?? false),
        updatedAt: String(v.updatedAt ?? ''),
      })
    }
  }

  const themes = [...byKey.values()]
  const activeKey = storedActiveKey || 'base'
  const activeBase = byKey.get(activeKey) ?? byKey.get('base') ?? presetToTheme(THEME_PRESETS[0]!, true)
  return {
    active: { ...activeBase, isActive: true },
    themes: themes.map((theme) => ({ ...theme, isActive: theme.themeKey === activeKey })),
  }
}

export async function rtdbGetSettings(): Promise<PaymentSettings> {
  const root = await loadRoot()
  const settingsRoot = (root.settings ?? {}) as Record<string, any>
  const data = (settingsRoot.main ?? settingsRoot) as Record<string, any>
  return {
    id: 1,
    companyName: String(data.companyName ?? 'Eclipse Tech'),
    logoUrl: String(data.logoUrl ?? ''),
    musicUrl: String(data.musicUrl ?? ''),
    studentDiscountPercent: Number(data.studentDiscountPercent ?? 0),
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

/** Todos los perfiles de clientes registrados en la tienda (RTDB). */
/** Todos los perfiles de clientes registrados en la tienda (RTDB). */
export async function rtdbGetCustomers(): Promise<CustomerProfile[]> {
  const raw = await readNode('usuarios_clientes')
  if (!raw || typeof raw !== 'object') return []

  const customers: CustomerProfile[] = []
  for (const [uid, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const profile = value as Record<string, unknown>
    const fullName = [profile.nombres, profile.apellidos]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' ')
    const rol = String(profile.rol ?? '').toLowerCase().trim()

    customers.push({
      uid,
      email: String(profile.email || profile.correo || ''),
      displayName: String(profile.displayName || profile.nombre || fullName),
      isStudent: Boolean(profile.isStudent ?? rol === 'estudiante'),
      // El rol legacy "estudiante" NO aprueba el descuento: solo el panel puede hacerlo.
      studentApproved:
        profile.studentApproved === true ||
        String(profile.studentApproved ?? '').toLowerCase() === 'true',
      studentCredentialUrl: String(profile.studentCredentialUrl ?? ''),
      createdAt: String(profile.createdAt || profile.fecha_registro || ''),
      updatedAt: String(profile.updatedAt ?? ''),
    })
  }

  // Primero las solicitudes de estudiante pendientes, luego por registro reciente.
  return customers.sort(
    (a, b) =>
      Number(b.isStudent && !b.studentApproved) - Number(a.isStudent && !a.studentApproved) ||
      (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) ||
      a.email.localeCompare(b.email),
  )
}

/** @deprecated Usa rtdbGetCustomers(): ahora devuelve todos los clientes. */
export const rtdbGetStudents = rtdbGetCustomers

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

/** RTDB puede devolver las cuentas como array o como objeto indexado. */
function normalizeDeliveredAccounts(raw: unknown): DeliveredAccount[] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const values = Array.isArray(raw) ? raw : Object.values(raw as Record<string, unknown>)
  const accounts = values
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .map((value) => ({
      email: String(value.email ?? ''),
      password: String(value.password ?? ''),
      validFrom: String(value.validFrom ?? ''),
      validTo: String(value.validTo ?? ''),
      platform: value.platform ? String(value.platform) : undefined,
    }))
  return accounts.length > 0 ? accounts : undefined
}

/**
 * La clave real del pedido en RTDB no siempre coincide con el id numérico
 * calculado por `hashId`. Se reutiliza en todas las escrituras sobre orders.
 */
function findOrderKey(ordersNode: Record<string, any> | null, id: number): string | null {
  if (!ordersNode || typeof ordersNode !== 'object') return null
  return (
    Object.keys(ordersNode).find((candidate) => {
      const numeric = Number(candidate)
      const resolved =
        Number.isInteger(numeric) && String(numeric) === candidate
          ? numeric
          : hashId(`order:${candidate}`)
      return resolved === id
    }) ?? null
  )
}

export async function rtdbGetOrders(): Promise<PagedResult<Order>> {
  const root = await loadRoot()
  const ordersNode = (root.orders ?? null) as Record<string, any> | null
  const orders: Order[] = []
  if (ordersNode && typeof ordersNode === 'object') {
    for (const [key, val] of Object.entries(ordersNode)) {
      if (!val || typeof val !== 'object') continue
      const o = val as Record<string, any>
      const numericKey = Number(key)
      const id = Number.isInteger(numericKey) && String(numericKey) === key ? numericKey : hashId(`order:${key}`)
      const adultRaw = (o.adultVerification ?? o.verificacionAdulto ?? null) as Record<string, any> | null
      const adultVerification =
        adultRaw && typeof adultRaw === 'object'
          ? {
              documentUrl: String(adultRaw.documentUrl ?? adultRaw.credencial ?? '') || null,
              selfieUrl: String(adultRaw.selfieUrl ?? adultRaw.selfie ?? '') || null,
              verified: Boolean(adultRaw.verified ?? adultRaw.verificado ?? false),
              verifiedAt:
                adultRaw.verifiedAt ?? adultRaw.verificadoEn
                  ? String(adultRaw.verifiedAt ?? adultRaw.verificadoEn)
                  : null,
            }
          : null
      orders.push({
        id,
        orderNumber: String(o.numero ?? o.orderNumber ?? `ECL-${key}`),
        customerName: String(o.cliente ?? o.customerName ?? ''),
        customerEmail: o.customerEmail ?? o.email ? String(o.customerEmail ?? o.email) : null,
        customerPhone: o.customerPhone ?? o.telefono ? String(o.customerPhone ?? o.telefono) : null,
        customerUid: o.customerUid ?? o.clienteUid ?? o.uid ?? o.usuarioUid
          ? String(o.customerUid ?? o.clienteUid ?? o.uid ?? o.usuarioUid)
          : null,
        subtotal: Number(o.subtotal ?? 0),
        discountAmount: Number(o.descuento ?? o.discountAmount ?? 0),
        totalAmount: Number(o.total ?? o.totalAmount ?? 0),
        paymentMethod: (o.metodoPago ?? o.paymentMethod ?? 'BBVA') as Order['paymentMethod'],
        status: (o.estado ?? o.status ?? 'Pending') as OrderStatus,
        couponCode: o.couponCode ?? o.cupon ? String(o.couponCode ?? o.cupon) : null,
        notes: o.notes ?? o.notas ? String(o.notes ?? o.notas) : null,
        items: Array.isArray(o.items) ? (o.items as Order['items']) : [],
        adultVerification,
        deliveredAccounts: normalizeDeliveredAccounts(o.deliveredAccounts),
        deliveredAt: o.deliveredAt ? String(o.deliveredAt) : undefined,
        deliveryEmailSent: Boolean(o.deliveryEmailSent ?? false),
        createdAt: String(o.creadoEn ?? o.createdAt ?? new Date(0).toISOString()),
        verifiedAt: o.verifiedAt ?? o.verificadoEn ? String(o.verifiedAt ?? o.verificadoEn) : null,
      })
    }
  }
  return { items: orders.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), page: 1, pageSize: 20, total: orders.length, totalPages: 1 }
}

function dayKey(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export async function rtdbDashboardStats(): Promise<DashboardStats> {
  const [ordersResult, products, coupons] = await Promise.all([rtdbGetOrders(), rtdbGetProducts(), rtdbGetCoupons()])

  const allOrders = ordersResult.items
  const today = new Date().toISOString().slice(0, 10)
  const pending = allOrders.filter((order) => order.status === 'Pending')
  const verified = allOrders.filter((order) => order.status === 'Verified')

  const salesLast7Days: DailySales[] = Array.from({ length: 7 }, (_, index) => {
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
    activeProducts: products.filter((product) => product.isActive).length,
    activeCoupons: coupons.filter((coupon) => coupon.isActive && !coupon.isExpired).length,
    verifiedRevenue: round2(verified.reduce((sum, order) => sum + order.totalAmount, 0)),
    pendingRevenue: round2(pending.reduce((sum, order) => sum + order.totalAmount, 0)),
    recentOrders: [...allOrders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6),
    salesLast7Days,
    topProducts: [...productUnits.values()].sort((a, b) => b.units - a.units).slice(0, 5),
  } satisfies DashboardStats
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

  const updates: Record<string, unknown> = {
    'info/plan': payload.name,
    'info/precio': payload.basePrice,
    'info/descuento': payload.discountPercent > 0 ? `${payload.discountPercent}%` : '',
    'info/tipo': payload.durationMonths >= 12 ? 'Anual' : payload.durationMonths >= 6 ? 'Semestral' : 'Mensual',
    activa: payload.isActive,
    actualizadoEn: new Date().toISOString(),
  }

  if (payload.imageUrl.trim()) {
    updates['info/portada_individual'] = payload.imageUrl.trim()
  }

  await update(ref(rtdb, `catalogo/${product._platform}/${product._plan}`), updates)

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

/** Las reglas de RTDB solo permiten al admin escribir `studentApproved`. */
export async function rtdbApproveStudent(uid: string, approved: boolean): Promise<void> {
  if (!uid) throw new Error('Perfil de estudiante no encontrado.')
  await fbUpdate(ref(rtdb, `usuarios_clientes/${uid}`), { studentApproved: approved })
  invalidateRtdbCache()
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
  const root = await loadRoot()
  const key = findOrderKey((root.orders ?? null) as Record<string, any> | null, id)
  if (!key) throw new Error('Orden no encontrada en Firebase.')
  const now = new Date().toISOString()
  await update(ref(rtdb, `orders/${key}`), {
    status,
    estado: status,
    verifiedAt: status === 'Verified' ? now : null,
    actualizadoEn: now,
  })
}

/** Marca (o revierte) la verificación de mayoría de edad de un pedido +18. */
export async function rtdbVerifyAdult(id: number, verified = true): Promise<void> {
  const root = await loadRoot()
  const ordersNode = (root.orders ?? null) as Record<string, any> | null
  if (!ordersNode || typeof ordersNode !== 'object') {
    throw new Error('No hay órdenes registradas en Firebase.')
  }
  const key = findOrderKey(ordersNode, id)
  if (!key) throw new Error('Orden no encontrada en Firebase.')

  const record = (ordersNode[key] ?? {}) as Record<string, any>
  const current = (record.adultVerification ?? record.verificacionAdulto ?? {}) as Record<string, unknown>
  const now = new Date().toISOString()

  await update(ref(rtdb, `orders/${key}`), {
    adultVerification: {
      ...current,
      verified,
      verifiedAt: verified ? now : null,
    },
    actualizadoEn: now,
  })
}

/** Guarda las cuentas entregadas de un pedido sin sobrescribir el resto del nodo. */
export async function rtdbSaveDelivery(
  orderId: number,
  accounts: DeliveredAccount[],
  emailSent: boolean,
): Promise<void> {
  const root = await loadRoot()
  const key = findOrderKey((root.orders ?? null) as Record<string, any> | null, orderId)
  if (!key) throw new Error('Orden no encontrada en Firebase.')

  const now = new Date().toISOString()
  await update(ref(rtdb, `orders/${key}`), {
    deliveredAccounts: accounts,
    deliveredAt: now,
    deliveryEmailSent: emailSent,
  })
}


//esta mamada ya esta bien pero no se pq no se sube correctamente a git aunque haga push completo alv