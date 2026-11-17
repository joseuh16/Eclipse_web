import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  Loader2,
  PackageSearch,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from 'lucide-react'
import { CATEGORY_LABELS, api } from '../lib/api'
import { formatCurrency } from '../lib/pricing'
import { cn } from '../lib/utils'
import type { Category, Product } from '../types'
import { ProductCard } from './ProductCard'

interface CatalogProps {
  category: Category | 'all'
  onCategoryChange: (category: Category | 'all') => void
  search: string
  onSearchChange: (term: string) => void
  includeAdult: boolean
  onOpenProduct: (product: Product) => void
}

type SortValue = 'newest' | 'price_asc' | 'price_desc' | 'name' | 'discount'

const sortOptions: Array<{ value: SortValue; label: string }> = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'discount', label: 'Mayor descuento' },
  { value: 'name', label: 'Nombre A–Z' },
]

const categories: Category[] = [
  'Video',
  'IA',
  'Edicion',
  'Escolar',
  'Musica',
  'Deportes',
  'Lifelong',
  'AdultPlus',
]

export function Catalog({
  category,
  onCategoryChange,
  search,
  onSearchChange,
  includeAdult,
  onOpenProduct,
}: CatalogProps) {
  const [sort, setSort] = useState<SortValue>('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [minDraft, setMinDraft] = useState('')
  const [maxDraft, setMaxDraft] = useState('')
  const [priceFilter, setPriceFilter] = useState<{ min?: number; max?: number }>({})
  const [priceError, setPriceError] = useState('')
  const [searchDraft, setSearchDraft] = useState(search)
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    setSearchDraft(search)
  }, [search])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await api.getProducts({
          category: category === 'all' ? undefined : category,
          search: search || undefined,
          sort,
          minPrice: priceFilter.min,
          maxPrice: priceFilter.max,
          includeAdult,
          page: 1,
          pageSize: 12,
        })
        if (cancelled) return
        setItems(response.items)
        setTotal(response.total)
        setPage(1)
      } catch (requestError) {
        if (cancelled) return
        setItems([])
        setTotal(0)
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No pudimos cargar el catálogo en este momento.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [category, search, sort, priceFilter.min, priceFilter.max, includeAdult, retry])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (category !== 'all') count++
    if (search) count++
    if (priceFilter.min !== undefined || priceFilter.max !== undefined) count++
    return count
  }, [category, search, priceFilter])

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    onSearchChange(searchDraft.trim())
  }

  const applyPrice = () => {
    const min = minDraft.trim() ? Number(minDraft) : undefined
    const max = maxDraft.trim() ? Number(maxDraft) : undefined

    if ((min !== undefined && (!Number.isFinite(min) || min < 0)) || (max !== undefined && (!Number.isFinite(max) || max < 0))) {
      setPriceError('Ingresa montos válidos.')
      return
    }
    if (min !== undefined && max !== undefined && min > max) {
      setPriceError('El precio mínimo no puede superar al máximo.')
      return
    }

    setPriceError('')
    setPriceFilter({ min, max })
    setFiltersOpen(false)
  }

  const resetPrice = () => {
    setMinDraft('')
    setMaxDraft('')
    setPriceFilter({})
    setPriceError('')
  }

  const clearAll = () => {
    onCategoryChange('all')
    onSearchChange('')
    setSearchDraft('')
    setSort('newest')
    resetPrice()
  }

  const loadMore = async () => {
    if (loadingMore || items.length >= total) return
    setLoadingMore(true)
    try {
      const response = await api.getProducts({
        category: category === 'all' ? undefined : category,
        search: search || undefined,
        sort,
        minPrice: priceFilter.min,
        maxPrice: priceFilter.max,
        includeAdult,
        page: page + 1,
        pageSize: 12,
      })
      setItems((current) => [...current, ...response.items])
      setPage((current) => current + 1)
      setTotal(response.total)
    } catch {
      setError('No pudimos cargar más productos. Intenta de nuevo.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section id="catalogo" className="page-shell scroll-mt-28 pt-16 sm:pt-24">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
            <Tag size={12} className="text-secondary" />
            Catálogo digital
          </p>
          <h2 className="mt-2 section-title">
            Tu próximo upgrade,
            <span className="text-gradient"> a un clic.</span>
          </h2>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-white/45 sm:text-sm">
            Licencias de streaming, IA, edición y más. Filtra, compara y elige la duración que necesitas.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {loading ? 'Actualizando...' : `${total} licencias disponibles`}
          </span>
          {includeAdult && (
            <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-2 text-red-200/80">
              +18 activo
            </span>
          )}
        </div>
      </div>

      <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <form onSubmit={submitSearch} className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Buscar dentro del catálogo..."
              className="field h-11 !rounded-full !py-0 pl-11 pr-24"
              aria-label="Buscar en el catálogo"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {searchDraft && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft('')
                    onSearchChange('')
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full text-white/35 transition hover:bg-white/10 hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={13} />
                </button>
              )}
              <button
                type="submit"
                className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white/75 transition hover:bg-white/15 hover:text-white"
              >
                Buscar
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
                className="field h-11 appearance-none !rounded-full !py-0 pl-4 pr-9 text-xs"
                aria-label="Ordenar productos"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/35"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className={cn(
                'relative flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition',
                filtersOpen || activeFilterCount > 0
                  ? 'border-primary/40 bg-primary/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white',
              )}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-3 grid gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4 animate-fade-in lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
            <label className="block">
              <span className="field-label">Categoría</span>
              <div className="relative">
                <select
                  value={category}
                  onChange={(event) => onCategoryChange(event.target.value as Category | 'all')}
                  className="field h-11 appearance-none !rounded-xl !py-0 pr-9 text-xs"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35"
                />
              </div>
            </label>

            <div>
              <span className="field-label">Rango de precio (MXN)</span>
              <div className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={minDraft}
                  onChange={(event) => setMinDraft(event.target.value)}
                  placeholder="Mín."
                  className="field h-11 !rounded-xl !py-0 text-xs"
                  aria-label="Precio mínimo"
                />
                <span className="text-white/25">—</span>
                <input
                  inputMode="decimal"
                  value={maxDraft}
                  onChange={(event) => setMaxDraft(event.target.value)}
                  placeholder="Máx."
                  className="field h-11 !rounded-xl !py-0 text-xs"
                  aria-label="Precio máximo"
                />
              </div>
              {priceError && <p className="mt-1.5 text-[10px] text-rose-300">{priceError}</p>}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={applyPrice} className="btn-primary !h-11 !px-5 !py-0 !text-xs">
                Aplicar
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex h-11 items-center gap-1.5 rounded-full border border-white/10 px-4 text-xs font-medium text-white/50 transition hover:text-white"
              >
                <RotateCcw size={12} />
                Limpiar
              </button>
            </div>
          </div>
        )}

        {(activeFilterCount > 0 || priceFilter.min !== undefined || priceFilter.max !== undefined) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {category !== 'all' && (
              <FilterChip onRemove={() => onCategoryChange('all')}>
                {CATEGORY_LABELS[category]}
              </FilterChip>
            )}
            {search && (
              <FilterChip
                onRemove={() => {
                  onSearchChange('')
                  setSearchDraft('')
                }}
              >
                “{search}”
              </FilterChip>
            )}
            {(priceFilter.min !== undefined || priceFilter.max !== undefined) && (
              <FilterChip onRemove={resetPrice}>
                {priceFilter.min !== undefined ? formatCurrency(priceFilter.min) : 'Desde $0'} —{' '}
                {priceFilter.max !== undefined ? formatCurrency(priceFilter.max) : 'Sin límite'}
              </FilterChip>
            )}
            <button
              type="button"
              onClick={clearAll}
              className="ml-1 text-[10px] font-medium text-white/35 underline-offset-4 transition hover:text-white hover:underline"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {error && !loading ? (
        <div className="mt-10 rounded-3xl border border-rose-400/15 bg-rose-500/[0.055] p-10 text-center">
          <PackageSearch size={32} className="mx-auto text-rose-300/70" />
          <p className="mt-4 text-sm font-medium text-white/80">No pudimos cargar el catálogo</p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-white/40">{error}</p>
          <button
            type="button"
            onClick={() => setRetry((current) => current + 1)}
            className="btn-secondary mt-5 !py-2.5 !text-xs"
          >
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
            >
              <div className="skeleton aspect-[16/10] w-full rounded-none" />
              <div className="space-y-3 p-5">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton mt-4 h-10 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.025] p-12 text-center">
          <PackageSearch size={36} className="mx-auto text-white/25" />
          <p className="mt-4 font-display text-lg font-semibold text-white/80">No encontramos licencias</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-white/40">
            Prueba con otra categoría, limpia los filtros o busca un término diferente.
          </p>
          <button type="button" onClick={clearAll} className="btn-secondary mt-5 !py-2.5 !text-xs">
            <RotateCcw size={13} />
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} onOpen={onOpenProduct} />
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-[10px] text-white/30">
              Mostrando {items.length} de {total} licencias
            </p>
            {items.length < total && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-secondary min-w-48"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>Cargar más licencias</>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function FilterChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-medium text-white/70">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="grid h-4 w-4 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
        aria-label="Quitar filtro"
      >
        <X size={10} />
      </button>
    </span>
  )
}
