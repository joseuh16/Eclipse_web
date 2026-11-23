import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Loader2, Search, X } from 'lucide-react'
import { CATEGORY_LABELS, api } from '../lib/api'
import { formatCurrency } from '../lib/pricing'
import { cn } from '../lib/utils'
import { useStore } from '../context/StoreContext'
import type { Product } from '../types'

interface PredictiveSearchProps {
  includeAdult: boolean
  onSearch: (term: string) => void
  mobile?: boolean
}

export function PredictiveSearch({ includeAdult, onSearch, mobile = false }: PredictiveSearchProps) {
  const { openQuickBuy } = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        if (query.trim().length >= 2) setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [query])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.getProducts({
          search: term,
          pageSize: 6,
          includeAdult,
          sort: 'newest',
        })
        if (!cancelled) {
          setResults(response.items)
          setActiveIndex(-1)
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, includeAdult])

  const submit = (term: string) => {
    const clean = term.trim()
    if (!clean) return
    onSearch(clean)
    setOpen(false)
    setQuery(clean)
  }

  const selectProduct = (product: Product) => {
    openQuickBuy(product)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.min(current + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        selectProduct(results[activeIndex])
      } else {
        submit(query)
        inputRef.current?.blur()
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={mobile ? 'Buscar licencias...' : 'Busca streaming, IA, edición...'}
          className={cn(
            'h-11 w-full rounded-full border border-white/10 bg-white/[0.045] pl-11 pr-20 text-sm text-white placeholder:text-white/30 transition focus:border-primary/50 focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-primary/10',
            mobile && 'h-12',
          )}
          aria-label="Buscar productos"
          aria-expanded={showDropdown}
          aria-controls="predictive-search-results"
          role="combobox"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading ? (
            <Loader2 size={15} className="animate-spin text-white/40" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setResults([])
                inputRef.current?.focus()
              }}
              className="grid h-6 w-6 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-white/35 sm:block">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {showDropdown && (
        <div
          id="predictive-search-results"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[65] overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c17]/98 p-2 shadow-card backdrop-blur-2xl animate-scale-in"
        >
          {results.length > 0 ? (
            <>
              <p className="px-3 pb-1.5 pt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Resultados
              </p>
              <ul>
                {results.map((product, index) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectProduct(product)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition',
                        activeIndex === index ? 'bg-white/[0.08]' : 'hover:bg-white/[0.055]',
                      )}
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white/5">
                        <ProductThumb imageUrl={product.imageUrl} name={product.name} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-white">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-white/40">
                          {CATEGORY_LABELS[product.category]}
                          {product.discountPercent > 0 && (
                            <span className="ml-1.5 text-emerald-300">-{product.discountPercent}%</span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular text-white/80">
                        {formatCurrency(product.finalPrice)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => submit(query)}
                className="mt-1 flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.035] px-3 py-2.5 text-left text-[11px] font-medium text-white/65 transition hover:bg-white/[0.07] hover:text-white"
              >
                Ver todos los resultados para “{query.trim()}”
                <ArrowRight size={13} />
              </button>
            </>
          ) : (
            <div className="px-4 py-8 text-center">
              {loading ? (
                <p className="text-xs text-white/45">Buscando en el catálogo...</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-white/75">Sin resultados</p>
                  <p className="mt-1 text-[11px] text-white/40">
                    Prueba con “streaming”, “IA” o “música”.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProductThumb({ imageUrl, name }: { imageUrl: string; name: string }) {
  const [failed, setFailed] = useState(!imageUrl)
  if (failed) {
    return (
      <span className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/40 to-secondary/20 text-[10px] font-bold text-white/80">
        {name.slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      src={imageUrl}
      alt=""
      className="h-full w-full object-contain p-1"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
