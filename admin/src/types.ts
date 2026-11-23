export type Category =
  | 'Video'
  | 'IA'
  | 'Edicion'
  | 'Escolar'
  | 'Musica'
  | 'Deportes'
  | 'Lifelong'
  | 'AdultPlus'

export type PaymentMethod = 'BBVA' | 'MercadoPago' | 'OXXO'
export type OrderStatus = 'Pending' | 'Verified' | 'Cancelled'

export type PageKey =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'theme'
  | 'coupons'
  | 'combos'
  | 'banners'
  | 'settings'
  | 'content'
  | 'customers'
  | 'database'


export const CATEGORIES: Category[] = [
  'Video',
  'IA',
  'Edicion',
  'Escolar',
  'Musica',
  'Deportes',
  'Lifelong',
  'AdultPlus',
]

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

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: 'Pendiente',
  Verified: 'Verificada',
  Cancelled: 'Cancelada',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BBVA: 'BBVA',
  MercadoPago: 'Mercado Pago',
  OXXO: 'OXXO',
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
  diademuertos: 'Día de Muertos',
  grito: 'Día del Grito',
  amor: 'Amor y Amistad',
}

export interface AdminUser {
  id: number
  username: string
  role: string
  lastLoginAt: string | null
}

export interface LoginResponse {
  token: string
  expiresAtUtc: string
  user: AdminUser
}

export interface Product {
  id: number
  name: string
  category: Category
  basePrice: number
  finalPrice: number
  discountPercent: number
  durationMonths: number
  imageUrl: string
  isActive: boolean
  isAdultOnly: boolean
  isFeatured: boolean
  createdAt: string
}

export interface ProductInput {
  name: string
  category: Category
  basePrice: number
  discountPercent: number
  durationMonths: number
  imageUrl: string
  isActive: boolean
  isAdultOnly: boolean
  isFeatured: boolean
}

export interface Theme {
  id: number
  themeKey: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  fontStyle: string
  customCss: string
  isActive: boolean
  updatedAt: string
}

export interface ThemeResponse {
  active: Theme | null
  themes: Theme[]
}

export interface ThemeInput {
  themeKey: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  fontStyle: string
  customCss: string
}

export interface Banner {
  id: number
  title: string
  description: string
  discountText: string
  expiryDate: string | null
  isActive: boolean
  imageUrl: string
  ctaText: string
  ctaUrl: string
  sortOrder: number
  isExpired: boolean
}

export interface BannerInput {
  title: string
  description: string
  discountText: string
  expiryDate: string | null
  isActive: boolean
  imageUrl: string
  ctaText: string
  ctaUrl: string
  sortOrder: number
}

export interface Coupon {
  id: number
  code: string
  discountPercent: number
  maxUses: number
  usedCount: number
  expiryDate: string | null
  isActive: boolean
  createdAt: string
  isExpired: boolean
  remainingUses: number
}

export interface CouponInput {
  code: string
  discountPercent: number
  maxUses: number
  expiryDate: string | null
  isActive: boolean
}

export interface Combo {
  id: number
  name: string
  description: string
  minProfiles: number
  discountPercent: number
  isActive: boolean
  createdAt: string
}

export interface ComboInput {
  name: string
  description: string
  minProfiles: number
  discountPercent: number
  isActive: boolean
}

export interface PaymentSettings {
  id: number
  companyName: string
  logoUrl: string
  studentDiscountPercent: number
  bankName: string
  beneficiary: string
  clabeNumber: string
  mercadoPagoClabe: string
  oxxoReference: string
  whatsAppNumber: string
  supportEmail: string
  paymentNote: string
  updatedAt: string
}

export type PaymentSettingsInput = Omit<PaymentSettings, 'id' | 'updatedAt'>

/** Perfil de un cliente registrado en la tienda (RTDB: usuarios_clientes). */
export interface CustomerProfile {
  uid: string
  email: string
  displayName: string
  isStudent: boolean
  studentApproved: boolean
  studentCredentialUrl: string
  createdAt: string
  updatedAt: string
}

/** @deprecated Usa CustomerProfile. Se conserva por compatibilidad. */
export type StudentProfile = CustomerProfile

export interface SiteContent {
  id: number
  heroImageUrl: string
  heroTitle: string
  heroDescription: string
  updatedAt: string
}

export type SiteContentInput = Omit<SiteContent, 'id' | 'updatedAt'>

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

export interface NewsInput {
  slug: string
  title: string
  date: string
  excerpt: string
  imageUrl: string
  body: string[]
}

export interface OrderItemSnapshot {
  name: string
  category: string
  productId: number | null
  productIds: number[] | null
  durationMonths: number
  quantity: number
  originalUnitPrice: number
  unitPrice: number
  lineTotal: number
  comboDiscountPercent: number
  imageUrl: string
  isAdultOnly: boolean
}

export interface AdultVerification {
  documentUrl: string | null
  selfieUrl: string | null
  verified: boolean
  verifiedAt: string | null
}

/** Cuenta entregada al cliente tras la verificación del pedido. */
export interface DeliveredAccount {
  email: string
  password: string
  validFrom: string
  validTo: string
  platform?: string
}

export interface Order {
  id: number
  orderNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  customerUid?: string | null
  subtotal: number
  discountAmount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  status: OrderStatus
  couponCode: string | null
  notes: string | null
  items: OrderItemSnapshot[]
  adultVerification?: AdultVerification | null
  deliveredAccounts?: DeliveredAccount[]
  deliveredAt?: string
  deliveryEmailSent?: boolean
  createdAt: string
  verifiedAt: string | null
}

export interface DashboardStats {
  pendingOrders: number
  todayOrders: number
  totalOrders: number
  activeProducts: number
  activeCoupons: number
  verifiedRevenue: number
  pendingRevenue: number
  recentOrders: Order[]
  salesLast7Days: DailySales[]
  topProducts: TopProduct[]
}

export interface DailySales {
  date: string
  orders: number
  revenue: number
}

export interface TopProduct {
  name: string
  units: number
  revenue: number
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiProblem {
  title?: string
  detail?: string
  message?: string
  errors?: Record<string, string[]>
  status?: number
}

export interface CouponValidation {
  valid: boolean
  code: string
  discountPercent: number
  message: string
}
