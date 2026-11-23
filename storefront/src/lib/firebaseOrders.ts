// ---------------------------------------------------------------------------
// Pedidos de la tienda en Firebase (best-effort).
// Se reflejan en RTDB (y en Firestore si está disponible).
// No bloquea la compra si la base no está disponible o las reglas lo impiden.
// ---------------------------------------------------------------------------
import { ref, set } from 'firebase/database'
import { doc, setDoc } from 'firebase/firestore'
import { db, rtdb } from './firebase'
import type { CreateOrderPayload, OrderConfirmation } from '../types'

function buildOrderData(confirmation: OrderConfirmation, payload: CreateOrderPayload) {
  return {
    id: confirmation.orderId,
    orderNumber: confirmation.orderNumber,
    customerName: confirmation.customerName,
    customerEmail: payload.customerEmail ?? null,
    customerPhone: payload.customerPhone ?? null,
    customerUid: payload.customerUid ?? null,
    isStudent: Boolean(payload.studentDiscountPercent && payload.studentDiscountPercent > 0),
    studentDiscountPercent: payload.studentDiscountPercent ?? 0,
    subtotal: confirmation.subtotal,
    discountAmount: confirmation.discountAmount,
    totalAmount: confirmation.totalAmount,
    paymentMethod: confirmation.paymentMethod,
    status: 'Pending',
    couponCode: payload.couponCode ?? null,
    notes: payload.notes ?? null,
    items: confirmation.items,
    adultConsent: Boolean(payload.adultConsent),
    adultVerification: payload.adultDocumentUrl
      ? {
          documentUrl: payload.adultDocumentUrl,
          selfieUrl: payload.adultSelfieUrl ?? null,
          verified: false,
          verifiedAt: null,
        }
      : null,
    createdAt: confirmation.createdAt,
    verifiedAt: null,
  }
}

export async function mirrorOrderToRtdb(
  confirmation: OrderConfirmation,
  payload: CreateOrderPayload,
): Promise<void> {
  try {
    await set(ref(rtdb, `orders/${confirmation.orderId}`), buildOrderData(confirmation, payload))
  } catch {
    // Reglas de RTDB sin permiso de escritura: el pedido sigue guardado localmente.
  }
}

export async function mirrorOrderToFirestore(
  confirmation: OrderConfirmation,
  payload: CreateOrderPayload,
): Promise<void> {
  await setDoc(doc(db, 'orders', String(confirmation.orderId)), buildOrderData(confirmation, payload), { merge: true })
}

