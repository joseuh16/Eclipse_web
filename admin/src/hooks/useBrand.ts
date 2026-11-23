import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export interface Brand {
  companyName: string
  logoUrl: string
}

const FALLBACK: Brand = { companyName: 'Eclipse Tech', logoUrl: '' }

/** Marca configurable del panel: se lee una sola vez de la configuración de la tienda. */
export function useBrand(): Brand {
  const [brand, setBrand] = useState<Brand>(FALLBACK)

  useEffect(() => {
    let active = true
    api.settings
      .get()
      .then((settings) => {
        if (!active) return
        setBrand({
          companyName: settings.companyName?.trim() || FALLBACK.companyName,
          logoUrl: settings.logoUrl?.trim() || '',
        })
      })
      .catch(() => {
        // Sin configuración disponible se conserva la marca por defecto.
      })
    return () => {
      active = false
    }
  }, [])

  return brand
}
