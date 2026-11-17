import { ArrowUpRight, ShieldAlert, Sparkles } from 'lucide-react'
import { CATEGORY_GRADIENTS, CATEGORY_LABELS } from '../lib/api'
import { formatCurrency } from '../lib/pricing'
import { cn } from '../lib/utils'
import type { Product } from '../types'
import { ProductImage } from './ProductImage'

interface ProductCardProps {
  product: Product
  onOpen: (product: Product) => void
  className?: string
}

export function ProductCard({ product, onOpen, className }: ProductCardProps) {
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] transition duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055] hover:shadow-card',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative block aspect-[16/10] w-full overflow-hidden text-left"
        aria-label={`Ver detalles de ${product.name}`}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-transparent to-black/10" />

        <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.discountPercent > 0 && (
            <span className="rounded-full border border-emerald-300/25 bg-emerald-400/90 px-2.5 py-1 text-[10px] font-extrabold text-emerald-950 shadow-sm">
              -{product.discountPercent}%
            </span>
          )}
          {product.isFeatured && (
            <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200 backdrop-blur">
              <Sparkles size={9} />
              Top
            </span>
          )}
          {product.isAdultOnly && (
            <span className="flex items-center gap-1 rounded-full border border-red-300/30 bg-red-500/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur">
              <ShieldAlert size={9} />
              +18
            </span>
          )}
        </span>

        <span
          className={cn(
            'absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur-md',
            product.category === 'AdultPlus' && 'border-red-400/25 text-red-200',
          )}
        >
          {CATEGORY_LABELS[product.category]}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'h-1 w-8 rounded-full bg-gradient-to-r',
              CATEGORY_GRADIENTS[product.category],
            )}
          />
          <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-white/30">
            Licencia digital
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 min-h-[2.6rem] font-display text-[15px] font-semibold leading-[1.35] tracking-[-0.01em] text-white">
          <button type="button" onClick={() => onOpen(product)} className="text-left transition hover:text-white/80">
            {product.name}
          </button>
        </h3>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white tabular">
                {formatCurrency(product.finalPrice)}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wide text-white/30">/ 1 mes</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              {product.discountPercent > 0 && (
                <span className="price-old">{formatCurrency(product.basePrice)}</span>
              )}
              <span className="text-[9px] text-white/30">Impuestos incluidos</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpen(product)}
            className="group/btn flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 text-[11px] font-semibold text-white/75 transition hover:border-primary/40 hover:bg-primary/20 hover:text-white"
          >
            Elegir
            <ArrowUpRight
              size={13}
              className="transition group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </article>
  )
}
