import type { OrderConfirmation } from '../types'

const KEY = 'eclipse_client_orders_v1'

export interface StoredOrder extends OrderConfirmation {
  status: 'Pending' | 'Verified' | 'Cancelled'
  paymentDueAt: string
}

function computeDueAt(createdAt: string): string {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  d.setHours(d.getHours() + 24)
  return d.toISOString()
}

export function readClientOrders(): StoredOrder[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredOrder[]
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  } catch {
    return []
  }
}

export function saveClientOrder(order: OrderConfirmation): StoredOrder {
  const stored: StoredOrder = {
    ...order,
    status: 'Pending',
    paymentDueAt: computeDueAt(order.createdAt),
  }
  const current = readClientOrders().filter((o) => o.orderId !== stored.orderId)
  const next = [stored, ...current].slice(0, 50)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return stored
}

export function clearClientOrders() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
