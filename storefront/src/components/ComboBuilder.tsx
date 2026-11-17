import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Info,
  Layers3,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { CATEGORY_LABELS, api } from '../lib/api'
import { comboQuote, DURATIONS, DURATION_LABELS, formatCurrency, unitPrice } from '../lib/pricing'
import { cn } from '../lib/utils'
import { useToast } from '../context/ToastContext'
import type { Category, Product } from '../types'
import { ProductImage } from './ProductImage'

const CATEGORIES: Category[] = ['Video', 'IA', 'Edicion', 'Escolar', 'Musica', 'Deportes', 'Lifelong']
const MAX_PROFILES = 8

export function ComboBuilder() {
  const { combos, addCombo, openCart } = useStore()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Product[]>([])
  const [duration, setDuration] = useState(3)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)

    api
      .getProducts({ pageSize: 48, sort: 'newest', includeAdult: false })
      .then((response) => {
        if (!cancelled) setProducts(response.items.filter((product) => !product.isAdultOnly))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [retry])

  const tiers = useMemo(
    () => [...combos].filter((combo) => combo.isActive).sort((a, b) => a.minProfiles - b.minProfiles),
    [combos],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false
      if (term && !product.name.toLowerCase().includes(term)) return false
      return true
    })
  }, [products, category, query])

  const quote = selected.length >= 2 ? comboQuote(selected, duration, combos) : null
  const nextTier = tiers.find((tier) => tier.minProfiles > selected.length)
  const maxTier = tiers.at(-1)
  const progress = selected.length === 0 ? 0 : nextTier ? Math.min(100, (selected.length / nextTier.minProfiles) * 100) : 100

  const toggle = (product: Product) => {
    setSelected((current) => {
      if (current.some((item) => item.id === product.id)) {
        return current.filter((item) => item.id !== product.id)
      }
      if (current.length >= MAX_PROFILES) {
        toast(`Puedes combinar hasta ${MAX_PROFILES} perfiles`, 'info')
        return current
      }
      return [...current, product]
    })
  }

  const addToCart = () => {
    if (selected.length < 2) {
      toast('Selecciona al menos 2 perfiles para armar tu combo', 'info')
      return
    }
    addCombo(selected, duration)
    setSelected([])
    openCart()
  }

  return (
    <section id="combos" className="page-shell scroll-mt-28 pt-16 sm:pt-24">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent/80">
            <Layers3 size={12} />
            Combo Builder
          </p>
          <h2 className="mt-2 section-title">
            Arma tu combo.
            <span className="text-gradient"> Paga menos.</span>
          </h2>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-white/45 sm:text-sm">
            Combina cualquier licencia de 2 a 8 perfiles y desbloquea descuentos progresivos automáticos.
            Sin códigos, sin complicaciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tiers.map((tier) => {
            const unlocked = selected.length >= tier.minProfiles
            return (
              <span
                key={tier.id}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-[10px] font-semibold transition',
                  unlocked
                    ? 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200'
                    : 'border-white/10 bg-white/[0.035] text-white/45',
                )}
              >
                {tier.minProfiles}+ perfiles · -{tier.discountPercent}%
              </span>
            )
          })}
        </div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/[0.08] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">1. Elige tus perfiles</p>
                <p className="mt-1 text-[10px] text-white/35">
                  Mínimo 2 · máximo {MAX_PROFILES} · {selected.length} seleccionado{selected.length === 1 ? '' : 's'}
                </p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/65">
                Descuento automático
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar perfiles..."
                  className="field h-10 !rounded-xl !py-0 pl-9 text-xs"
                  aria-label="Buscar perfiles para el combo"
                />
              </div>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as Category | 'all')}
                className="field h-10 !rounded-xl !py-0 text-xs sm:w-44"
                aria-label="Filtrar perfiles por categoría"
              >
                <option value="all">Todas las categorías</option>
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[540px] overflow-y-auto p-3 sm:p-4">
            {loading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl border border-white/5 p-2.5">
                    <div className="skeleton h-14 w-14 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-full" />
                      <div className="skeleton h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : failed ? (
              <div className="py-16 text-center">
                <p className="text-sm text-white/60">No pudimos cargar los perfiles.</p>
                <button
                  type="button"
                  onClick={() => setRetry((current) => current + 1)}
                  className="btn-secondary mt-4 !py-2 !text-xs"
                >
                  Reintentar
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Search size={28} className="mx-auto text-white/20" />
                <p className="mt-3 text-xs text-white/40">No hay perfiles con ese filtro.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setCategory('all')
                  }}
                  className="mt-3 text-[10px] text-white/55 underline underline-offset-4 hover:text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filtered.map((product) => {
                  const selectedIndex = selected.findIndex((item) => item.id === product.id)
                  const isSelected = selectedIndex >= 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggle(product)}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-2xl border p-2.5 text-left transition duration-300',
                        isSelected
                          ? 'border-primary/55 bg-primary/10 shadow-glow-sm'
                          : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]',
                      )}
                      aria-pressed={isSelected}
                    >
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        {isSelected && (
                          <span className="absolute inset-0 grid place-items-center bg-primary/40 backdrop-blur-[1px]">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-primary">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          </span>
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block line-clamp-2 text-[11px] font-semibold leading-[1.35] text-white/85">
                          {product.name}
                        </span>
                        <span className="mt-1 block text-[9px] text-white/35">
                          {CATEGORY_LABELS[product.category]}
                        </span>
                        <span className="mt-1 block text-[11px] font-semibold tabular text-white/75">
                          {formatCurrency(unitPrice(product, duration))}
                          <span className="ml-1 text-[8px] font-normal text-white/30">
                            / {DURATION_LABELS[duration]}
                          </span>
                        </span>
                      </span>

                      <span
                        className={cn(
                          'absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full border text-[8px] font-bold transition',
                          isSelected
                            ? 'border-transparent bg-white text-primary'
                            : 'border-white/15 text-white/30 group-hover:border-white/30',
                        )}
                      >
                        {isSelected ? selectedIndex + 1 : '+'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">2. Tu combo</p>
                <p className="mt-1 text-[10px] text-white/35">Ajusta duración y revisa tu ahorro.</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-accent">
                <Sparkles size={17} />
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[9px] font-medium text-white/40">
                <span>{selected.length} de {nextTier?.minProfiles ?? maxTier?.minProfiles ?? 4} perfiles</span>
                <span>{nextTier ? `Siguiente: -${nextTier.discountPercent}%` : 'Máximo descuento'}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-500"
                  style={{ width: `${Math.max(3, progress)}%` }}
                />
              </div>
              <p className="mt-2 text-[9px] text-white/35">
                {nextTier
                  ? `Agrega ${nextTier.minProfiles - selected.length} perfil${nextTier.minProfiles - selected.length === 1 ? '' : 'es'} más para desbloquear ${nextTier.discountPercent}% de descuento.`
                  : selected.length >= 2
                    ? '¡Desbloqueaste el descuento máximo de combos!'
                    : 'Selecciona tus primeros 2 perfiles.'}
              </p>
            </div>

            <div className="mt-4 max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {selected.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/15 px-4 py-8 text-center">
                  <Layers3 size={22} className="mx-auto text-white/20" />
                  <p className="mt-2 text-[10px] leading-5 text-white/35">
                    Tus perfiles seleccionados aparecerán aquí.
                  </p>
                </div>
              ) : (
                selected.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-1.5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/5">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-medium text-white/75">
                        {index + 1}. {product.name}
                      </p>
                      <p className="text-[8px] text-white/30">{CATEGORY_LABELS[product.category]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(product)}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/30 transition hover:bg-white/10 hover:text-white"
                      aria-label={`Quitar ${product.name}`}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4">
              <p className="field-label">Duración de la licencia</p>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATIONS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setDuration(months)}
                    className={cn(
                      'rounded-xl border px-1 py-2 text-[10px] font-semibold transition',
                      duration === months
                        ? 'border-accent/50 bg-accent/15 text-accent'
                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white',
                    )}
                    aria-pressed={duration === months}
                  >
                    {months === 1 ? '1 mes' : `${months} meses`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-white/[0.08] pt-4 text-[11px]">
              <div className="flex items-center justify-between text-white/45">
                <span>Precio de lista</span>
                <span className="tabular">{quote ? formatCurrency(quote.original) : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-300/80">
                <span>Descuento combo {quote?.discountPercent ? `(${quote.discountPercent}%)` : ''}</span>
                <span className="tabular">{quote ? `-${formatCurrency(quote.savings)}` : '—'}</span>
              </div>
              <div className="flex items-end justify-between border-t border-white/[0.08] pt-3">
                <span className="text-xs font-medium text-white/70">Total</span>
                <span className="font-display text-2xl font-bold tracking-tight text-white tabular">
                  {quote ? formatCurrency(quote.total) : '—'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={addToCart}
              disabled={selected.length < 2}
              className="btn-primary mt-4 w-full"
            >
              <ShoppingBag size={15} />
              {selected.length < 2
                ? `Elige ${2 - selected.length} perfil${2 - selected.length === 1 ? '' : 'es'} más`
                : 'Agregar combo al carrito'}
              {selected.length >= 2 && <ArrowRight size={14} />}
            </button>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-black/15 p-2.5">
              <Info size={12} className="mt-0.5 shrink-0 text-secondary" />
              <p className="text-[9px] leading-4 text-white/35">
                El descuento del combo se calcula sobre el precio con duración seleccionada. Se valida
                nuevamente al confirmar tu pedido.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
