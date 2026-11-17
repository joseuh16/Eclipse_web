// ---------------------------------------------------------------------------
// Fuente de datos de la tienda.
// 1) Firebase Realtime Database (catalogo/promociones) — fuente principal.
// 2) Firestore — respaldo de lectura.
// Mantiene la misma interfaz que usaba la API .NET para no romper componentes.
// ---------------------------------------------------------------------------
import type { Category, CreateOrderPayload, NewsItem, ProductQuery, SiteContent } from '../types'
import {
  firestoreGetBanners,
  firestoreGetCombos,
  firestoreGetProducts,
  firestoreGetSettings,
  firestoreGetSiteContent,
  firestoreGetTheme,
  firestoreValidateCoupon,
} from './firestoreStore'
import {
  rtdbCreateOrder,
  rtdbGetBanners,
  rtdbGetCombos,
  rtdbGetProducts,
  rtdbGetSettings,
  rtdbGetTheme,
  rtdbValidateCoupon,
} from './rtdb'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function wrap<T>(promise: Promise<T>, fallbackMessage: string): Promise<T> {
  return promise.catch((error) => {
    if (error instanceof ApiError) throw error
    const message = error instanceof Error ? error.message : fallbackMessage
    throw new ApiError(message || fallbackMessage, 0)
  })
}

/** Intenta Firestore; si falla o no hay datos, usa la RTDB. */
async function withRtdbFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  isEmpty?: (value: T) => boolean,
): Promise<T> {
  try {
    const value = await primary()
    if (!isEmpty || !isEmpty(value)) return value
  } catch {
    // Firestore no disponible (no creado, reglas, sin red): continuar con RTDB.
  }
  return fallback()
}

/** Contenido de respaldo cuando Firestore no está disponible. */
const DEFAULT_CONTENT: { site: SiteContent; news: NewsItem[] } = {
  site: {
    heroImageUrl:
      'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1400&q=80',
    heroTitle: 'Tu entretenimiento, sin límites',
    heroDescription:
      'Licencias digitales de streaming, IA y productividad con entrega inmediata, pago seguro y soporte real.',
    updatedAt: '',
  },
  news: [] as NewsItem[],
}

async function getFallbackContent(): Promise<{ site: SiteContent; news: NewsItem[] }> {
  return DEFAULT_CONTENT
}

export const api = {
  getTheme: () =>
    wrap(
      withRtdbFallback(rtdbGetTheme, firestoreGetTheme),
      'No pudimos cargar el tema de la tienda.',
    ),

  getBanners: () =>
    wrap(
      withRtdbFallback(rtdbGetBanners, firestoreGetBanners, (banners) => banners.length === 0),
      'No pudimos cargar las promociones.',
    ),

  getSettings: () =>
    wrap(
      withRtdbFallback(rtdbGetSettings, firestoreGetSettings),
      'No pudimos cargar la configuración de pago.',
    ),

  getCombos: () =>
    wrap(
      withRtdbFallback(rtdbGetCombos, firestoreGetCombos, (combos) => combos.length === 0),
      'No pudimos cargar los combos.',
    ),

  content: {
    get: () =>
      wrap(
        withRtdbFallback(getFallbackContent, firestoreGetSiteContent),
        'No pudimos cargar el contenido del sitio.',
      ),
  },

  getProducts: (query: ProductQuery = {}) =>
    wrap(
      withRtdbFallback(
        () => rtdbGetProducts(query),
        () => firestoreGetProducts(query),
        (result) => result.total === 0,
      ),
      'No pudimos cargar el catálogo.',
    ),

  getFeaturedProducts: (includeAdult = false) =>
    wrap(
      withRtdbFallback(
        () => rtdbGetProducts({ featured: true, pageSize: 12, includeAdult }),
        () => firestoreGetProducts({ featured: true, pageSize: 12, includeAdult }),
        (result) => result.total === 0,
      ),
      'No pudimos cargar los destacados.',
    ),

  validateCoupon: (code: string) =>
    wrap(
      withRtdbFallback(() => rtdbValidateCoupon(code), () => firestoreValidateCoupon(code)),
      'No pudimos validar el cupón.',
    ),

  createOrder: (payload: CreateOrderPayload) =>
    wrap(rtdbCreateOrder(payload), 'No pudimos crear tu pedido. Intenta de nuevo.'),
}

export const CATEGORY_LABELS: Record<Category, string> = {
  Video: 'Video',
  IA: 'IA',
  Edicion: 'Edición',
  Escolar: 'Escolar',
  Musica: 'Música',
  Deportes: 'Deportes',
  Lifelong: 'Lifelong',
  AdultPlus: '+18',
}

export const CATEGORY_GRADIENTS: Record<Category, string> = {
  Video: 'from-violet-500 to-fuchsia-500',
  IA: 'from-cyan-400 to-blue-500',
  Edicion: 'from-amber-400 to-orange-500',
  Escolar: 'from-emerald-400 to-teal-500',
  Musica: 'from-pink-500 to-rose-500',
  Deportes: 'from-lime-400 to-green-500',
  Lifelong: 'from-sky-400 to-indigo-500',
  AdultPlus: 'from-red-500 to-rose-700',
}

export const SEASON_LABELS: Record<string, string> = {
  base: 'Cyber Dark',
  autumn: 'Otoño',
  halloween: 'Halloween',
  christmas: 'Navidad',
  reyes: 'Reyes Magos',
  mothers: 'Día de la Madre',
  children: 'Día del Niño',
  fathers: 'Día del Padre',
}

/** Emoji decorativo por temporada (cambia con el tema activo). */
export const SEASON_EMOJI: Record<string, string> = {
  base: '🌌',
  autumn: '🍂',
  halloween: '🎃',
  christmas: '🎄',
  reyes: '👑',
  mothers: '🌷',
  children: '🎈',
  fathers: '👔',
}
