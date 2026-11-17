// ---------------------------------------------------------------------------
// Pedidos de la tienda en Firestore (best-effort).
// No bloquea la compra si Firestore no está disponible o las reglas lo impiden.
// ---------------------------------------------------------------------------
import { doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { CreateOrderPayload, OrderConfirmation } from '../types'

export async function mirrorOrderToFirestore(
  confirmation: OrderConfirmation,
  payload: CreateOrderPayload,
): Promise<void> {
  const data = {
    id: confirmation.orderId,
    orderNumber: confirmation.orderNumber,
    customerName: confirmation.customerName,
    customerEmail: payload.customerEmail ?? null,
    customerPhone: payload.customerPhone ?? null,
    subtotal: confirmation.subtotal,
    discountAmount: confirmation.discountAmount,
    totalAmount: confirmation.totalAmount,
    paymentMethod: confirmation.paymentMethod,
    status: 'Pending',
    couponCode: payload.couponCode ?? null,
    notes: payload.notes ?? null,
    items: confirmation.items,
    createdAt: confirmation.createdAt,
    verifiedAt: null,
  }

  await setDoc(doc(db, 'orders', String(confirmation.orderId)), data, { merge: true })
}
