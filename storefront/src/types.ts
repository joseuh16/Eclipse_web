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

export interface SiteContent {
  heroImageUrl: string
  heroTitle: string
  heroDescription: string
  updatedAt: string
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

export interface Combo {
  id: number
  name: string
  description: string
  minProfiles: number
  discountPercent: number
  isActive: boolean
  createdAt: string
}

export interface PaymentSettings {
  id: number
  /** Nombre de la empresa mostrado en tienda y panel. */
  companyName: string
  /** URL del logo subido desde el panel (si no hay, se usa el logo CSS). */
  logoUrl: string
  /** Descuento global para estudiantes aprobados, en porcentaje. */
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

/** Perfil del cliente autenticado, guardado en usuarios_clientes/<uid> de RTDB. */
export interface CustomerProfile {
  uid: string
  email: string
  displayName: string
  isStudent: boolean
  /** Solo el panel puede poner esto en true. */
  studentApproved: boolean
  studentCredentialUrl: string
  createdAt: string
  updatedAt: string
}

export interface CouponValidation {
  valid: boolean
  code: string
  discountPercent: number
  message: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ProductQuery {
  category?: Category
  search?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name' | 'discount'
  featured?: boolean
  includeAdult?: boolean
  page?: number
  pageSize?: number
}

export type CartLine =
  | {
      id: string
      kind: 'product'
      product: Product
      durationMonths: number
      quantity: number
    }
  | {
      id: string
      kind: 'combo'
      products: Product[]
      durationMonths: number
      quantity: number
    }

export interface AppliedCoupon {
  code: string
  discountPercent: number
}

export interface OrderItemInput {
  productId?: number
  productIds?: number[]
  durationMonths: number
  quantity: number
}

export interface CreateOrderPayload {
  customerName: string
  customerEmail?: string
  customerPhone?: string
  /** UID de Firebase Auth cuando la persona inició sesión. */
  customerUid?: string
  paymentMethod: PaymentMethod
  couponCode?: string
  adultConsent: boolean
  /** Foto de credencial (INE/pasaporte) en dataURL — solo pedidos +18. */
  adultDocumentUrl?: string
  /** Selfie opcional con la credencial en dataURL — solo pedidos +18. */
  adultSelfieUrl?: string
  notes?: string
  /** Porcentaje de descuento de estudiante aprobado (0 si no aplica). */
  studentDiscountPercent?: number
  items: OrderItemInput[]
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

export interface OrderConfirmation {
  orderId: number
  orderNumber: string
  customerName: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  items: OrderItemSnapshot[]
  settings: PaymentSettings
  whatsAppUrl: string
  createdAt: string
}

export interface ApiProblem {
  title?: string
  detail?: string
  message?: string
  errors?: Record<string, string[]>
  status?: number
}
