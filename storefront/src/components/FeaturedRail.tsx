import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Crown } from 'lucide-react'
import { api } from '../lib/api'
import { scrollToId } from '../lib/hooks'
import type { Product } from '../types'
import { ProductCard } from './ProductCard'

interface FeaturedRailProps {
  includeAdult: boolean
  onOpen: (product: Product) => void
}

export function FeaturedRail({ includeAdult, onOpen }: FeaturedRailProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)

    api
      .getFeaturedProducts(includeAdult)
      .then((response) => {
        if (!cancelled) setProducts(response.items.slice(0, 10))
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          setProducts([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [includeAdult])

  const scroll = (direction: number) => {
    scrollerRef.current?.scrollBy({ left: direction * 330, behavior: 'smooth' })
  }

  if (failed || (!loading && products.length === 0)) {
    return null
  }

  return (
    <section className="page-shell pt-14 sm:pt-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent/80">
            <Crown size={12} />
            Selección Eclipse
          </p>
          <h2 className="mt-2 section-title !text-2xl sm:!text-3xl">Lo más pedido esta temporada</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-white/45">
            Licencias verificadas, activación rápida y soporte que sí responde.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="icon-btn hidden sm:flex"
            aria-label="Productos anteriores"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="icon-btn hidden sm:flex"
            aria-label="Siguientes productos"
          >
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollToId('catalogo')}
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:text-white sm:block"
          >
            Ver catálogo
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar -mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="w-[282px] shrink-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] sm:w-[310px]"
              >
                <div className="skeleton aspect-[16/10] w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-9 w-full rounded-full" />
                </div>
              </div>
            ))
          : products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={onOpen}
                className="w-[282px] shrink-0 snap-start sm:w-[310px]"
              />
            ))}
      </div>
    </section>
  )
}
