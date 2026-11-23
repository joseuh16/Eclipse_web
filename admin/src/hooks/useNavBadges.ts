import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

export interface NavBadges {
  pendingOrders: number
  pendingCustomers: number
}

const EMPTY: NavBadges = { pendingOrders: 0, pendingCustomers: 0 }

/**
 * Conteos ligeros para el menú: pedidos pendientes y solicitudes de estudiante
 * sin aprobar. Se carga al montar y al recuperar el foco; un fallo nunca
 * bloquea la navegación.
 */
export function useNavBadges(): NavBadges {
  const [badges, setBadges] = useState<NavBadges>(EMPTY)

  const load = useCallback(async () => {
    try {
      const [orders, customers] = await Promise.all([
        api.orders.list({ status: 'Pending', pageSize: 1 }),
        api.customers.list(),
      ])
      setBadges({
        pendingOrders: orders.total,
        pendingCustomers: customers.filter(
          (customer) => customer.isStudent && !customer.studentApproved,
        ).length,
      })
    } catch {
      // Los badges son informativos: si falla la lectura se mantienen en 0.
    }
  }, [])

  useEffect(() => {
    void load()
    const onFocus = () => {
      void load()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  return badges
}
