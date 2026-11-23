import type { DeliveredAccount, Order } from '../types'

/**
 * Construye un mailto listo para enviar las cuentas entregadas de un pedido.
 * No hay servicio de correo externo: se abre el cliente de correo del admin.
 */
export function buildDeliveryMailto(
  order: Order,
  accounts: DeliveredAccount[],
  companyName: string,
): string {
  const to = (order.customerEmail ?? '').trim()
  const subject = `Tus cuentas de ${companyName} · Pedido ${order.orderNumber}`
  const lines = [
    `Hola ${order.customerName.trim() || 'cliente'},`,
    '',
    `Gracias por tu compra en ${companyName}. Ya tenemos listo tu acceso.`,
    `Número de pedido: ${order.orderNumber}`,
    '',
    'Tus cuentas:',
  ]

  accounts.forEach((account, index) => {
    lines.push(
      `${index + 1}. ${account.platform?.trim() ? `${account.platform.trim()} · ` : ''}${account.email}`,
      `   Contraseña: ${account.password}`,
      `   Vigencia: ${account.validFrom || '—'} al ${account.validTo || '—'}`,
      '',
    )
  })

  lines.push(
    'Si tienes algún problema con el acceso, responde a este correo o escríbenos a soporte y te ayudamos.',
    '',
    `Equipo ${companyName}`,
  )

  const params = new URLSearchParams({ subject, body: lines.join('\n') })
  return `mailto:${to}?${params.toString().replace(/\+/g, '%20')}`
}
