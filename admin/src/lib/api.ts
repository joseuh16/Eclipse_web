// ---------------------------------------------------------------------------
// API de datos del panel — Firebase Realtime Database (RTDB).
// Punto de entrada unificado: catálogo, promociones, combos, temas, settings,
// cupones, contenido e órdenes se leen/escrituran desde Firebase Realtime DB
// usando la misma instancia `rtdb` de ./firebase.
// ---------------------------------------------------------------------------
import { ApiError, UNAUTHORIZED_EVENT, getToken, setToken, api as firestoreApi } from './firestoreApi'
import {
  bannerKeys,
  hashId,
  rtdbGetBanners,
  rtdbGetCombos,
  rtdbGetContent,
  rtdbGetCoupons,
  rtdbGetOrders,
  rtdbGetProducts,
  rtdbGetSettings,
  rtdbGetTheme,
  rtdbRemoveBanner,
  rtdbRemoveCombo,
  rtdbRemoveCouponById,
  rtdbRemoveProductById,
  rtdbRemoveNews,
  rtdbSaveBanner,
  rtdbSaveCombo,
  rtdbSaveContent,
  rtdbSaveNews,
  rtdbSaveCoupon,
  rtdbSaveSettings,
  rtdbSaveTheme,
  rtdbSaveProductFor,
  rtdbToggleProduct,
  rtdbUpdateOrder,
  rtdbUpdateProduct,
} from './rtdb'
import type {
  Banner,
  BannerInput,
  Category,
  Combo,
  ComboInput,
  Coupon,
  CouponInput,
  NewsInput,
  NewsItem,
  Order,
  OrderStatus,
  PaymentSettings,
  PaymentSettingsInput,
  PagedResult,
  ProductInput,
  SiteContent,
  SiteContentInput,
  Theme,
  ThemeInput,
} from '../types'

export { ApiError, UNAUTHORIZED_EVENT, getToken, setToken }

const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') || `key-${Date.now()}`

function isExpiredDate(expiryDate: string | null | undefined): boolean {
  return Boolean(expiryDate && new Date(expiryDate).getTime() < Date.now())
}

function toBanner(payload: BannerInput, id: number, key: string): Banner {
  const isExpired = isExpiredDate(payload.expiryDate)
  void key
  return {
    id,
    title: payload.title,
    description: payload.description,
    discountText: payload.discountText,
    expiryDate: payload.expiryDate,
    isActive: !isExpired && payload.isActive,
    imageUrl: payload.imageUrl,
    ctaText: payload.ctaText,
    ctaUrl: payload.ctaUrl,
    sortOrder: payload.sortOrder,
    isExpired,
  }
}

function toCoupon(input: CouponInput, id: number, usedCount: number, createdAt: string): Coupon {
  const isExpired = input.expiryDate ? new Date(input.expiryDate).getTime() < Date.now() : false
  const remainingUses = input.maxUses > 0 ? Math.max(0, input.maxUses - usedCount) : 999
  return {
    id,
    code: input.code,
    discountPercent: input.discountPercent,
    maxUses: input.maxUses,
    usedCount,
    expiryDate: input.expiryDate,
    isActive: input.isActive,
    createdAt,
    isExpired: isExpired || !input.isActive,
    remainingUses: isExpired ? 0 : remainingUses,
  }
}

export const api = {
  auth: firestoreApi.auth,
  dashboard: firestoreApi.dashboard,

  products: {
    list: (params: { search?: string; category?: Category } = {}) => rtdbGetProducts(params),
    create: (payload: ProductInput) => rtdbSaveProductFor(payload),
    update: (id: number, payload: ProductInput) => rtdbUpdateProduct(id, payload),
    toggle: async (id: number) => {
      const items = await rtdbGetProducts()
      const product = items.find((p) => p.id === id)
      if (!product) throw new Error('Producto no encontrado.')
      const next = !product.isActive
      await rtdbToggleProduct(id, next)
      return { ...product, isActive: next }
    },
    remove: async (id: number) => {
      await rtdbRemoveProductById(id)
    },
  },

  banners: {
    list: () => rtdbGetBanners(),
    create: async (payload: BannerInput) => {
      const key = slug(payload.title)
      await rtdbSaveBanner(key, {
        titulo: payload.title,
        descripcion: payload.description,
        descuento: payload.discountText,
        imagen_fondo: payload.imageUrl,
        imagen: payload.imageUrl,
        cta_text: payload.ctaText,
        cta_url: payload.ctaUrl,
        fecha_limite: payload.expiryDate,
        sortOrder: payload.sortOrder,
        activo: payload.isActive,
      })
      const id = hashId(`banner:${key}`)
      bannerKeys.set(id, key)
      return toBanner(payload, id, key)
    },
    update: async (id: number, payload: BannerInput) => {
      const key = bannerKeys.get(id)
      if (!key) throw new Error('Promoción no encontrada.')
      await rtdbSaveBanner(key, {
        titulo: payload.title,
        descripcion: payload.description,
        descuento: payload.discountText,
        imagen_fondo: payload.imageUrl,
        imagen: payload.imageUrl,
        cta_text: payload.ctaText,
        cta_url: payload.ctaUrl,
        fecha_limite: payload.expiryDate,
        sortOrder: payload.sortOrder,
        activo: payload.isActive,
      })
      return toBanner(payload, id, key)
    },
    toggle: async (id: number) => {
      const key = bannerKeys.get(id)
      const banners = await rtdbGetBanners()
      const current = banners.find((b) => b.id === id)
      if (!key || !current) throw new Error('Promoción no encontrada.')
      const nextActive = !(current.isActive && !current.isExpired)
      await rtdbSaveBanner(key, {
        titulo: current.title,
        descripcion: current.description,
        descuento: current.discountText,
        imagen_fondo: current.imageUrl,
        imagen: current.imageUrl,
        cta_text: current.ctaText,
        cta_url: current.ctaUrl,
        fecha_limite: current.expiryDate,
        sortOrder: current.sortOrder,
        activo: nextActive,
      })
      const updated = await rtdbGetBanners()
      const found = updated.find((b) => b.id === id)
      if (!found) throw new Error('Promoción no encontrada.')
      return found
    },
    remove: async (id: number) => {
      const key = bannerKeys.get(id)
      if (key) await rtdbRemoveBanner(key)
    },
  },

  combos: {
    list: () => rtdbGetCombos(),
    create: async (payload: ComboInput) => {
      const id = hashId(`combo:${payload.name}`)
      const createdAt = new Date().toISOString()
      await rtdbSaveCombo(id, { ...payload, createdAt })
      return { id, ...payload, createdAt } satisfies Combo
    },
    update: async (id: number, payload: ComboInput) => {
      const items = await rtdbGetCombos()
      const combo = items.find((c) => c.id === id)
      if (!combo) throw new Error('Combo no encontrado.')
      await rtdbSaveCombo(combo.id, { ...combo, ...payload })
      return { ...combo, ...payload } satisfies Combo
    },
    toggle: async (id: number) => {
      const items = await rtdbGetCombos()
      const combo = items.find((c) => c.id === id)
      if (!combo) throw new Error('Combo no encontrado.')
      const next = !combo.isActive
      await rtdbSaveCombo(combo.id, { ...combo, isActive: next })
      return { ...combo, isActive: next } satisfies Combo
    },
    remove: async (id: number) => {
      await rtdbRemoveCombo(id)
    },
  },

  coupons: {
    list: () => rtdbGetCoupons(),
    create: async (payload: CouponInput) => {
      const createdAt = new Date().toISOString()
      await rtdbSaveCoupon(payload.code, {
        code: payload.code,
        discountPercent: payload.discountPercent,
        maxUses: payload.maxUses,
        usedCount: 0,
        expiryDate: payload.expiryDate,
        isActive: payload.isActive,
      })
      return toCoupon(
        { code: payload.code, discountPercent: payload.discountPercent, maxUses: payload.maxUses, expiryDate: payload.expiryDate, isActive: payload.isActive },
        hashId(`coupon:${payload.code}`),
        0,
        createdAt,
      )
    },
    update: async (id: number, payload: CouponInput) => {
      const items = await rtdbGetCoupons()
      const coupon = items.find((c) => c.id === id)
      if (!coupon) throw new Error('Cupón no encontrado.')
      await rtdbSaveCoupon(coupon.code, {
        code: payload.code,
        discountPercent: payload.discountPercent,
        maxUses: payload.maxUses,
        usedCount: coupon.usedCount,
        expiryDate: payload.expiryDate,
        isActive: payload.isActive,
      })
      return toCoupon(payload, coupon.id, coupon.usedCount, coupon.createdAt)
    },
    toggle: async (id: number) => {
      const items = await rtdbGetCoupons()
      const coupon = items.find((c) => c.id === id)
      if (!coupon) throw new Error('Cupón no encontrado.')
      const next = !coupon.isActive
      await rtdbSaveCoupon(coupon.code, {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        maxUses: coupon.maxUses,
        usedCount: coupon.usedCount,
        expiryDate: coupon.expiryDate,
        isActive: next,
      })
      return toCoupon(coupon, coupon.id, coupon.usedCount, coupon.createdAt)
    },
    remove: async (id: number) => {
      await rtdbRemoveCouponById(id)
    },
  },

  orders: {
    list: async (params: {
      status?: OrderStatus
      search?: string
      from?: string
      to?: string
      page?: number
      pageSize?: number
    } = {}) => {
      const result = await rtdbGetOrders()
      let items = [...result.items]
      if (params.status) items = items.filter((o) => o.status === params.status)
      const term = params.search?.trim().toLowerCase()
      if (term) {
        items = items.filter((o) =>
          [o.orderNumber, o.customerName, o.customerEmail, o.customerPhone]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term)),
        )
      }
      const from = params.from ? new Date(params.from).getTime() : -Infinity
      const to = params.to ? new Date(params.to).getTime() : Infinity
      items = items.filter((o) => +new Date(o.createdAt) >= from && +new Date(o.createdAt) <= to)
      const page = Math.max(1, params.page ?? 1)
      const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20))
      const total = items.length
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const start = (page - 1) * pageSize
      return { items: items.slice(start, start + pageSize), page, pageSize, total, totalPages } satisfies PagedResult<Order>
    },
    updateStatus: async (id: number, status: OrderStatus) => {
      await rtdbUpdateOrder(id, status)
      const result = await rtdbGetOrders()
      const order = result.items.find((o) => o.id === id)
      if (!order) throw new ApiError('Orden no encontrada.', 404)
      return order
    },
  },

  settings: {
    get: () => rtdbGetSettings(),
    update: async (payload: PaymentSettingsInput) => {
      await rtdbSaveSettings(payload)
      return { ...payload, id: 1, updatedAt: new Date().toISOString() } as PaymentSettings
    },
  },

  theme: {
    get: () => rtdbGetTheme(),
    save: async (payload: ThemeInput) => {
      const theme: Theme = { id: 1, ...payload, isActive: true, updatedAt: new Date().toISOString() }
      await rtdbSaveTheme(payload.themeKey, theme)
      return theme
    },
    activate: async (themeKey: string) => {
      const response = await rtdbGetTheme()
      const target = response.themes.find((theme) => theme.themeKey === themeKey) ?? response.active ?? null
      if (!target) throw new Error('Tema no encontrado.')
      const updated: Theme = { ...target, isActive: true, updatedAt: new Date().toISOString() }
      await rtdbSaveTheme(themeKey, { ...updated, isActive: true })
      return updated
    },
  },

  content: {
    get: () => rtdbGetContent(),
    saveSite: async (payload: SiteContentInput) => {
      await rtdbSaveContent(payload)
      return { ...payload, id: 1, updatedAt: new Date().toISOString() } as SiteContent
    },
    news: {
      list: async (): Promise<NewsItem[]> => {
        const { news } = await rtdbGetContent()
        return news
      },
      create: async (data: NewsInput): Promise<NewsItem> => {
        const id = hashId(`news:${data.slug}`)
        const item: NewsItem = { id, ...data, createdAt: new Date().toISOString() }
        await rtdbSaveNews(item)
        return item
      },
      update: async (id: number, data: NewsInput): Promise<NewsItem> => {
        const { news } = await rtdbGetContent()
        const current = news.find((n) => n.id === id)
        if (!current) throw new Error('Noticia no encontrada.')
        const updated: NewsItem = {
          ...current,
          ...data,
          slug: data.slug.trim(),
          title: data.title.trim(),
          excerpt: data.excerpt.trim(),
          imageUrl: data.imageUrl.trim(),
          body: data.body.map((paragraph) => paragraph.trim()).filter(Boolean),
        }
        await rtdbSaveNews(updated)
        return updated
      },
      remove: async (id: number): Promise<void> => {
        const { news } = await rtdbGetContent()
        const current = news.find((n) => n.id === id)
        if (current) await rtdbRemoveNews(current.slug)
      },
    },
  },
}

export type { NewsItem }
