// ---------------------------------------------------------------------------
// Servicio Firestore para Eclipse Tech (tienda).
// Reemplaza las llamadas a la API propia por consultas directas a Firebase.
// Colecciones: products, themes, banners, coupons, combos, settings, orders.
// ---------------------------------------------------------------------------
// # por que si puedo declarar variables pero no mi amor por ella
// # dia dos no dormi en el codigo 
// ---------------------------------------------------------------------------
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Banner, Category, Product } from '../types'

const COLLECTIONS = {
  products: 'products',
  themes: 'themes',
  banners: 'banners',
  coupons: 'coupons',
  combos: 'combos',
  settings: 'settings',
  orders: 'orders',
} as const

// --- Productos --------------------------------------------------------------
export async function fetchProducts(options: {
  category?: Category | 'all'
  search?: string
  includeAdult?: boolean
  featured?: boolean
  pageSize?: number
} = {}): Promise<Product[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (options.category && options.category !== 'all') {
    constraints.push(where('category', '==', options.category))
  }
  if (options.featured) {
    constraints.push(where('isFeatured', '==', true))
  }
  if (options.pageSize) {
    constraints.push(limit(options.pageSize))
  }
  const q = query(collection(db, COLLECTIONS.products), ...constraints)
  const snapshot = await getDocs(q)
  let items = snapshot.docs.map((d) => ({ id: Number(d.id), ...(d.data() as Omit<Product, 'id'>) }))
  if (!options.includeAdult) {
    items = items.filter((item) => !item.isAdultOnly)
  }
  if (options.search) {
    const term = options.search.toLowerCase()
    items = items.filter((item) => item.name.toLowerCase().includes(term))
  }
  return items
}

export async function fetchProduct(id: number): Promise<Product | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.products, String(id)))
  if (!snap.exists()) return null
  return { id, ...(snap.data() as Omit<Product, 'id'>) }
}

// --- Temas ------------------------------------------------------------------
export async function fetchActiveTheme(): Promise<DocumentData | null> {
  const q = query(collection(db, COLLECTIONS.themes), where('isActive', '==', true), limit(1))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : snapshot.docs[0].data()
}

// --- Banners ----------------------------------------------------------------
export async function fetchActiveBanners(): Promise<Banner[]> {
  const q = query(collection(db, COLLECTIONS.banners), where('isActive', '==', true), orderBy('sortOrder', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: Number(d.id), ...(d.data() as Omit<Banner, 'id'>) }))
}

// --- Configuración de pago --------------------------------------------------
export async function fetchSettings(): Promise<DocumentData | null> {
  const q = query(collection(db, COLLECTIONS.settings), limit(1))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : snapshot.docs[0].data()
}

// --- Cupones ----------------------------------------------------------------
export async function validateCoupon(code: string): Promise<{ valid: boolean; discountPercent: number; message: string }> {
  const q = query(collection(db, COLLECTIONS.coupons), where('code', '==', code.trim().toUpperCase()), limit(1))
  const snapshot = await getDocs(q)
  if (snapshot.empty) {
    return { valid: false, discountPercent: 0, message: 'El cupón no existe.' }
  }
  const data = snapshot.docs[0].data()
  if (!data.isActive) return { valid: false, discountPercent: 0, message: 'El cupón está desactivado.' }
  if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
    return { valid: false, discountPercent: 0, message: 'El cupón ya expiró.' }
  }
  if (data.maxUses > 0 && data.usedCount >= data.maxUses) {
    return { valid: false, discountPercent: 0, message: 'El cupón alcanzó su límite de usos.' }
  }
  return { valid: true, discountPercent: data.discountPercent, message: `Cupón aplicado: ${data.discountPercent}% de descuento.` }
}

// --- Órdenes ----------------------------------------------------------------
export async function createOrder(payload: DocumentData): Promise<DocumentData> {
  const ref = await addDoc(collection(db, COLLECTIONS.orders), {
    ...payload,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  })
  return { id: ref.id, ...payload }
}

export { COLLECTIONS }
