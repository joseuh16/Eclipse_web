import type { CartLine, Combo, Product } from '../types'

export const DURATIONS = [1, 3, 6, 12] as const
export type Duration = (typeof DURATIONS)[number]

export const DURATION_LABELS: Record<number, string> = {
  1: '1 mes',
  3: '3 meses',
  6: '6 meses',
  12: '12 meses',
}

const MULTIPLIERS: Record<number, number> = {
  1: 1,
  3: 2.7,
  6: 5.1,
  12: 9.6,
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function durationMultiplier(months: number) {
  return MULTIPLIERS[months] ?? 1
}

export function listPrice(product: Product, months: number) {
  return round2(product.basePrice * durationMultiplier(months))
}

export function unitPrice(product: Product, months: number) {
  return round2(listPrice(product, months) * (1 - product.discountPercent / 100))
}

export interface ComboQuote {
  original: number
  discountPercent: number
  savings: number
  unit: number
  total: number
}

export function comboQuote(products: Product[], months: number, combos: Combo[], quantity = 1): ComboQuote {
  const original = round2(products.reduce((sum, product) => sum + unitPrice(product, months), 0))
  const tier = combos
    .filter((combo) => combo.isActive && combo.minProfiles <= products.length)
    .sort((a, b) => a.minProfiles - b.minProfiles)
    .at(-1)
  const discountPercent = tier?.discountPercent ?? 0
  const unit = round2(original * (1 - discountPercent / 100))

  return {
    original,
    discountPercent,
    savings: round2(original - unit),
    unit,
    total: round2(unit * quantity),
  }
}

export function lineQuote(line: CartLine, combos: Combo[]): ComboQuote {
  if (line.kind === 'combo') {
    return comboQuote(line.products, line.durationMonths, combos, line.quantity)
  }

  const original = round2(listPrice(line.product, line.durationMonths) * line.quantity)
  const unit = unitPrice(line.product, line.durationMonths)
  return {
    original,
    discountPercent: line.product.discountPercent,
    savings: round2(original - unit * line.quantity),
    unit,
    total: round2(unit * line.quantity),
  }
}

export function cartSubtotal(cart: CartLine[], combos: Combo[]) {
  return round2(cart.reduce((sum, line) => sum + lineQuote(line, combos).total, 0))
}

export function couponDiscount(subtotal: number, discountPercent: number) {
  return round2(subtotal * (discountPercent / 100))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function sanitizeWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? `52${digits}` : digits
}

export function buildWhatsAppLink(number: string, message: string) {
  return `https://wa.me/${sanitizeWhatsApp(number)}?text=${encodeURIComponent(message)}`
}

export function productLineId(productId: number, months: number) {
  return `p-${productId}-${months}`
}

export function comboLineId(productIds: number[], months: number) {
  return `c-${[...productIds].sort((a, b) => a - b).join('-')}-${months}`
}

export function savingsPercent(original: number, current: number) {
  if (original <= 0 || current >= original) return 0
  return Math.round(((original - current) / original) * 100)
}
