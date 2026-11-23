export interface PaymentProofDetail {
  orderNumber: string
  total: number
  whatsAppNumber: string
  companyName: string
  customerEmail?: string
}

const EVENT = 'eclipse:payment-proof'
const COMBO_EVENT = 'eclipse:open-combos'
const ACCOUNT_EVENT = 'eclipse:open-account'

/** Abre el modal de cuenta desde opiniones, chat o cualquier botón. */
export function openAccountModal() {
  window.dispatchEvent(new Event(ACCOUNT_EVENT))
}

export function onOpenAccountModal(callback: () => void): () => void {
  window.addEventListener(ACCOUNT_EVENT, callback)
  return () => window.removeEventListener(ACCOUNT_EVENT, callback)
}

/** Abre el creador de combos desde cualquier botón de la tienda. */
export function openComboBuilder() {
  window.dispatchEvent(new Event(COMBO_EVENT))
}

export function onOpenComboBuilder(callback: () => void): () => void {
  window.addEventListener(COMBO_EVENT, callback)
  return () => window.removeEventListener(COMBO_EVENT, callback)
}

/** Abre el modal de comprobante desde cualquier parte de la tienda. */
export function openPaymentProof(detail: PaymentProofDetail) {
  window.dispatchEvent(new CustomEvent<PaymentProofDetail>(EVENT, { detail }))
}

export function onPaymentProof(callback: (detail: PaymentProofDetail) => void): () => void {
  const handler = (event: Event) => callback((event as CustomEvent<PaymentProofDetail>).detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
