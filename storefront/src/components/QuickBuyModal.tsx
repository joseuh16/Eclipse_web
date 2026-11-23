import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  X,
  Zap,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useEscape } from '../lib/hooks'
import {
  DURATIONS,
  DURATION_LABELS,
  formatCurrency,
  listPrice,
  savingsPercent,
  unitPrice,
} from '../lib/pricing'
import { CATEGORY_GRADIENTS, CATEGORY_LABELS } from '../lib/api'
import { cn } from '../lib/utils'
import { ProductImage } from './ProductImage'

const features = [
  { icon: Zap, text: 'Activación digital el mismo día' },
  { icon: ShieldCheck, text: 'Compra protegida y soporte real' },
  { icon: BadgeCheck, text: 'Licencia verificada con garantía' },
]

export function QuickBuyModal() {
  const {
    quickBuyProduct: product,
    closeQuickBuy,
    addProduct,
    openCart,
    openCheckout,
  } = useStore()
  const [duration, setDuration] = useState(3)
  const [quantity, setQuantity] = useState(1)

  useEscape(Boolean(product), closeQuickBuy)

  useEffect(() => {
    if (!product) return
    const allowed = DURATIONS.includes(product.durationMonths as (typeof DURATIONS)[number])
    setDuration(allowed ? product.durationMonths : 3)
    setQuantity(1)
  }, [product])

  if (!product) return null

  const unit = unitPrice(product, duration)
  const total = unit * quantity
  const reference = product.basePrice * duration
  const savings = savingsPercent(reference, unit)

  const addToCart = () => {
    addProduct(product, duration, quantity)
    closeQuickBuy()
    openCart()
  }

  const buyNow = () => {
    addProduct(product, duration, quantity)
    closeQuickBuy()
    openCheckout()
  }

  return (
    <div className="modal-backdrop flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={closeQuickBuy}
        aria-label="Cerrar compra rápida"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-buy-title"
        className="modal-card max-h-[92vh] max-w-4xl overflow-y-auto animate-scale-in"
      >
        <button
          type="button"
          onClick={closeQuickBuy}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>

        <div className="grid sm:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-56 overflow-hidden bg-white/5 sm:min-h-full">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-contain p-8"
              eager
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b16] via-[#0b0b16]/25 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-[#0b0b16]/10 sm:to-[#0b0b16]" />

            <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
              <span
                className={cn(
                  'rounded-full bg-gradient-to-r px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-sm',
                  CATEGORY_GRADIENTS[product.category],
                )}
              >
                {CATEGORY_LABELS[product.category]}
              </span>
              {product.discountPercent > 0 && (
                <span className="rounded-full bg-emerald-400 px-2.5 py-1.5 text-[9px] font-extrabold text-emerald-950">
                  -{product.discountPercent}%
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 hidden rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl sm:block">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">
                Eclipse Tech
              </p>
              <p className="mt-1 text-[11px] leading-5 text-white/60">
                Compra 100% digital, con acompañamiento y garantía.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="pr-9">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                Compra rápida
              </p>
              <h2
                id="quick-buy-title"
                className="mt-2 font-display text-xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-2xl"
              >
                {product.name}
              </h2>
            </div>

            <p className="mt-3 text-[11px] leading-6 text-white/45">
              Elige tu duración, confirma la cantidad y agrega la licencia a tu carrito. La activación se
              coordina por WhatsApp al validar tu pago.
            </p>

            {product.isAdultOnly && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3">
                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-red-300" />
                <p className="text-[9px] leading-5 text-red-200/75">
                  Contenido exclusivo para mayores de 18 años. Deberás confirmar tu mayoría de edad al
                  finalizar la compra.
                </p>
              </div>
            )}

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="field-label !mb-0">Duración</p>
                <span className="text-[9px] text-white/30">Mejor precio a mayor plazo</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {DURATIONS.map((months) => {
                  const monthlyReference = product.basePrice * months
                  const planUnit = unitPrice(product, months)
                  const planSavings = savingsPercent(monthlyReference, planUnit)
                  return (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setDuration(months)}
                      className={cn(
                        'rounded-xl border px-1 py-2.5 text-center transition',
                        duration === months
                          ? 'border-accent/60 bg-accent/[0.12] shadow-[0_0_20px_-8px_rgb(var(--accent-rgb))]'
                          : 'border-white/10 bg-white/[0.025] hover:border-white/25',
                      )}
                      aria-pressed={duration === months}
                    >
                      <span
                        className={cn(
                          'block text-[10px] font-semibold',
                          duration === months ? 'text-accent' : 'text-white/60',
                        )}
                      >
                        {DURATION_LABELS[months]}
                      </span>
                      <span className="mt-1 block text-[9px] font-medium tabular text-white/45">
                        {formatCurrency(planUnit)}
                      </span>
                      {planSavings > 0 && (
                        <span className="mt-0.5 block text-[7px] font-semibold text-emerald-300/70">
                          -{planSavings}%
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
              <div>
                <p className="text-[10px] font-medium text-white/60">Cantidad</p>
                <p className="text-[8px] text-white/30">Máximo 10 por pedido</p>
              </div>
              <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.045]">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  className="grid h-9 w-9 place-items-center text-white/50 transition hover:text-white disabled:opacity-30"
                  aria-label="Disminuir cantidad"
                >
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center text-xs font-bold tabular text-white">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(10, current + 1))}
                  disabled={quantity >= 10}
                  className="grid h-9 w-9 place-items-center text-white/50 transition hover:text-white disabled:opacity-30"
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/[0.08] pt-4">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-white/30">Total</p>
                <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-white tabular">
                  {formatCurrency(total)}
                </p>
                <p className="text-[9px] text-white/30">
                  {formatCurrency(unit)} × {quantity} · {DURATION_LABELS[duration]}
                </p>
              </div>
              {savings > 0 && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[9px] font-semibold text-emerald-300">
                  Ahorras {savings}%
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={buyNow}
                className="btn-primary order-2 w-full !px-4 sm:order-1"
              >
                Comprar ahora
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={addToCart}
                className="btn-secondary order-1 w-full !px-4 sm:order-2"
              >
                <ShoppingBag size={14} />
                Al carrito
              </button>
            </div>

            <div className="mt-4 space-y-1.5">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.text} className="flex items-center gap-2 text-[9px] text-white/35">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-white/5 text-white/45">
                      <Icon size={9} />
                    </span>
                    {feature.text}
                    <Check size={9} className="ml-auto text-emerald-400/50" />
                  </div>
                )
              })}
            </div>

            <p className="mt-3 text-[8px] leading-4 text-white/25">
              Precio de referencia: {formatCurrency(listPrice(product, 1))} por 1 mes. El total final se
              valida en el servidor antes de confirmar tu orden.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
