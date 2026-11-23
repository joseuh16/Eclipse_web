import type { OrderConfirmation } from '../types'

const BASE_KEY = 'eclipse_client_orders_v1'

export interface StoredOrder extends OrderConfirmation {
  status: 'Pending' | 'Verified' | 'Cancelled'
  paymentDueAt: string
}

/** Cada cuenta de cliente tiene su propio historial en el navegador. */
function keyFor(ownerKey?: string): string {
  return ownerKey ? `${BASE_KEY}_${ownerKey}` : BASE_KEY
}

function computeDueAt(createdAt: string): string {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  d.setHours(d.getHours() + 24)
  return d.toISOString()
}

/** Migra el historial antiguo (sin cuenta) al primer usuario que inicia sesión. */
function migrateLegacy(ownerKey?: string): string | null {
  if (!ownerKey) return null
  const legacy = window.localStorage.getItem(BASE_KEY)
  if (!legacy) return null
  const target = keyFor(ownerKey)
  if (!window.localStorage.getItem(target)) {
    window.localStorage.setItem(target, legacy)
  }
  window.localStorage.removeItem(BASE_KEY)
  return legacy
}

export function readClientOrders(ownerKey?: string): StoredOrder[] {
  try {
    const key = keyFor(ownerKey)
    let raw = window.localStorage.getItem(key)
    if (!raw) raw = migrateLegacy(ownerKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredOrder[]
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  } catch {
    return []
  }
}

export function saveClientOrder(order: OrderConfirmation, ownerKey?: string): StoredOrder {
  const stored: StoredOrder = {
    ...order,
    status: 'Pending',
    paymentDueAt: computeDueAt(order.createdAt),
  }
  const current = readClientOrders(ownerKey).filter((o) => o.orderId !== stored.orderId)
  const next = [stored, ...current].slice(0, 50)
  try {
    window.localStorage.setItem(keyFor(ownerKey), JSON.stringify(next))
  } catch {
    // ignore
  }
  return stored
}

export function clearClientOrders(ownerKey?: string) {
  try {
    window.localStorage.removeItem(keyFor(ownerKey))
  } catch {
    // ignore
  }
}
