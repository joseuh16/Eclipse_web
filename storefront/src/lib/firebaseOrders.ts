// ---------------------------------------------------------------------------
// Pedidos de la tienda en Firebase (best-effort).
// Se reflejan en RTDB (y en Firestore si está disponible).
// No bloquea la compra si la base no está disponible o las reglas lo impiden.
// ---------------------------------------------------------------------------
import { get, ref, set } from 'firebase/database'
import { doc, setDoc } from 'firebase/firestore'
import { db, rtdb } from './firebase'
import { buildWhatsAppLink } from './pricing'
import type { StoredOrder } from './clientOrders'
import type { CreateOrderPayload, OrderConfirmation, PaymentSettings } from '../types'

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
    paymentDueAt: new Date(
      (new Date(confirmation.createdAt).getTime() || Date.now()) + 24 * 60 * 60 * 1000,
    ).toISOString(),
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

/**
 * Pedidos del cliente guardados en RTDB. Se filtran por uid o correo para que
 * "Mi cuenta" muestre automáticamente lo contratado y sus fechas de pago,
 * aunque la compra se haya hecho en otro dispositivo.
 */
export async function getMyRtdbOrders(
  uid: string,
  email: string,
  settings: PaymentSettings,
): Promise<StoredOrder[]> {
  try {
    const snap = await get(ref(rtdb, 'orders'))
    if (!snap.exists()) return []
    const raw = snap.val() as Record<string, any>
    const uidLower = (uid || '').toLowerCase()
    const emailLower = (email || '').trim().toLowerCase()
    const orders: StoredOrder[] = []

    for (const [key, value] of Object.entries(raw)) {
      if (!value || typeof value !== 'object') continue
      const order = value as Record<string, any>
      const orderUid = String(order.customerUid ?? order.uid ?? '').toLowerCase()
      const orderEmail = String(order.customerEmail ?? order.email ?? '').toLowerCase()
      const mine =
        (uidLower.length > 0 && orderUid === uidLower) ||
        (emailLower.length > 0 && orderEmail === emailLower)
      if (!mine) continue

      const createdAt = String(order.createdAt ?? order.creadoEn ?? new Date(0).toISOString())
      const createdMs = new Date(createdAt).getTime()
      const paymentDueAt = String(
        order.paymentDueAt ??
          new Date((Number.isNaN(createdMs) ? Date.now() : createdMs) + 24 * 60 * 60 * 1000).toISOString(),
      )
      const statusRaw = String(order.status ?? order.estado ?? 'Pending').toLowerCase()
      const status: StoredOrder['status'] =
        statusRaw === 'verified'
          ? 'Verified'
          : statusRaw === 'cancelled' || statusRaw === 'canceled'
            ? 'Cancelled'
            : 'Pending'

      orders.push({
        orderId: Number(order.id ?? key) || Date.now(),
        orderNumber: String(order.orderNumber ?? order.numero ?? `ECL-${key}`),
        customerName: String(order.customerName ?? order.cliente ?? ''),
        subtotal: Number(order.subtotal ?? 0),
        discountAmount: Number(order.discountAmount ?? order.descuento ?? 0),
        totalAmount: Number(order.totalAmount ?? order.total ?? 0),
        paymentMethod: (order.paymentMethod ?? order.metodoPago ?? 'BBVA') as StoredOrder['paymentMethod'],
        items: Array.isArray(order.items) ? order.items : [],
        settings,
        whatsAppUrl: String(
          order.whatsAppUrl ??
            buildWhatsAppLink(
              settings.whatsAppNumber,
              `Hola, quiero información de mi pedido ${order.orderNumber ?? order.numero ?? ''}.`,
            ),
        ),
        createdAt,
        status,
        paymentDueAt,
      })
    }

    return orders.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  } catch {
    return []
  }
}

