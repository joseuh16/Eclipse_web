import { useState } from 'react'
import {
  ArrowRight,
  ChevronRight,
  LockKeyhole,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import type { PaymentMethod } from '../types'
import { useToast } from '../context/ToastContext'
import { DURATIONS, DURATION_LABELS, buildWhatsAppLink, formatCurrency, lineQuote } from '../lib/pricing'
import { useEscape, scrollToId } from '../lib/hooks'
import { PaymentMethodOption, getPaymentDetails, PAYMENT_METHODS } from './PaymentDetails'
import { ProductImage } from './ProductImage'

export function CartDrawer({ onAccount }: { onAccount?: () => void } = {}) {
  const {
    cartOpen,
    closeCart,
    cart,
    cartCount,
    combos,
    settings,
    coupon,
    couponAmount,
    cartSubtotal,
    cartTotal,
    applyCoupon,
    removeCoupon,
    updateLine,
    removeLine,
    openCheckout,
  } = useStore()
  const { user, profile } = useCustomerAuth()
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BBVA')

  useEscape(cartOpen, closeCart)

  if (!cartOpen) return null

  const submitCoupon = async (event: React.FormEvent) => {
    event.preventDefault()
    setCouponError('')
    setCouponLoading(true)
    const result = await applyCoupon(code)
    setCouponLoading(false)

    if (result.ok) {
      toast(result.message, 'success')
      setCode('')
    } else {
      setCouponError(result.message)
    }
  }

  const goToCatalog = () => {
    closeCart()
    scrollToId('catalogo')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={closeCart}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-md animate-fade-in"
        aria-label="Cerrar carrito"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className="relative flex max-h-[90vh] w-full max-w-[520px] animate-scale-in flex-col overflow-hidden rounded-3xl border border-white/[0.12] bg-[#0a0a14] shadow-[0_30px_100px_-30px_rgba(0,0,0,.95)]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-accent">
              <ShoppingBag size={18} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-white">Tu carrito</h2>
              <p className="mt-0.5 text-[10px] text-white/35">
                {cartCount} {cartCount === 1 ? 'producto' : 'productos'} · activación digital
              </p>
            </div>
          </div>
          <button type="button" onClick={closeCart} className="icon-btn h-9 w-9" aria-label="Cerrar carrito">
            <X size={16} />
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/[0.035] text-white/25">
              <ShoppingBag size={28} />
            </span>
            <p className="mt-5 font-display text-lg font-semibold text-white/80">Tu carrito está vacío</p>
            <p className="mt-2 max-w-xs text-xs leading-6 text-white/40">
              Explora el catálogo y elige la licencia que necesitas. La activación es digital y rápida.
            </p>
            <button type="button" onClick={goToCatalog} className="btn-primary mt-6">
              Explorar catálogo
              <ArrowRight size={15} />
            </button>
            <div className="mt-6 flex items-center gap-1.5 text-[9px] text-white/25">
              <LockKeyhole size={10} />
              Compra protegida · Soporte por WhatsApp
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3 p-4 sm:p-5">
                {cart.map((line) => {
                  const quote = lineQuote(line, combos)
                  const name = line.kind === 'product' ? line.product.name : 'Combo Eclipse'
                  const image =
                    line.kind === 'product' ? line.product.imageUrl : line.products[0]?.imageUrl || ''
                  const category =
                    line.kind === 'product'
                      ? line.product.category
                      : `${line.products.length} perfiles`

                  return (
                    <article
                      key={line.id}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3"
                    >
                      <div className="flex gap-3">
                        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/5">
                          <ProductImage src={image} alt={name} className="h-full w-full p-1.5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-[12px] font-semibold leading-[1.4] text-white/85">
                                {name}
                              </p>
                              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-white/35">
                                <span>{category}</span>
                                {line.kind === 'combo' && quote.discountPercent > 0 && (
                                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 font-semibold text-emerald-300">
                                    -{quote.discountPercent}%
                                  </span>
                                )}
                              </p>
                              {line.kind === 'combo' && (
                                <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-white/30">
                                  {line.products.map((product) => product.name).join(' · ')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/25 transition hover:bg-rose-500/10 hover:text-rose-300"
                              aria-label={`Quitar ${name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <div className="relative">
                                <select
                                  value={line.durationMonths}
                                  onChange={(event) =>
                                    updateLine(line.id, { durationMonths: Number(event.target.value) })
                                  }
                                  className="h-8 appearance-none rounded-lg border border-white/10 bg-white/[0.045] pl-2.5 pr-6 text-[10px] font-medium text-white/70 focus:border-primary/50 focus:outline-none"
                                  aria-label={`Duración de ${name}`}
                                >
                                  {DURATIONS.map((months) => (
                                    <option key={months} value={months}>
                                      {DURATION_LABELS[months]}
                                    </option>
                                  ))}
                                </select>
                                <ChevronRight
                                  size={10}
                                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-white/35"
                                />
                              </div>

                              <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.045]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLine(line.id, { quantity: Math.max(1, line.quantity - 1) })
                                  }
                                  className="grid h-8 w-8 place-items-center text-white/45 transition hover:text-white disabled:opacity-30"
                                  disabled={line.quantity <= 1}
                                  aria-label="Disminuir cantidad"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="w-5 text-center text-[10px] font-semibold tabular text-white/80">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLine(line.id, { quantity: Math.min(10, line.quantity + 1) })
                                  }
                                  className="grid h-8 w-8 place-items-center text-white/45 transition hover:text-white disabled:opacity-30"
                                  disabled={line.quantity >= 10}
                                  aria-label="Aumentar cantidad"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-bold tabular text-white">
                                {formatCurrency(quote.total)}
                              </p>
                              {quote.savings > 0 && (
                                <p className="text-[8px] text-emerald-300/70">
                                  Ahorras {formatCurrency(quote.savings)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent">
                      <Tag size={13} />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-white/75">Cupón de descuento</p>
                      <p className="text-[9px] text-white/30">Aplícalo antes de finalizar tu compra.</p>
                    </div>
                  </div>

                  {coupon ? (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5">
                      <div>
                        <p className="font-mono text-[11px] font-bold text-emerald-200">{coupon.code}</p>
                        <p className="text-[9px] text-emerald-200/60">
                          {coupon.discountPercent}% de descuento aplicado
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeCoupon()
                          setCouponError('')
                        }}
                        className="text-[9px] font-semibold text-emerald-200/60 underline underline-offset-2 transition hover:text-emerald-100"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={submitCoupon} className="mt-3 flex gap-2">
                      <input
                        value={code}
                        onChange={(event) => {
                          setCode(event.target.value.toUpperCase())
                          setCouponError('')
                        }}
                        placeholder="Ej. ECLIPSE10"
                        maxLength={40}
                        className="field h-10 flex-1 !rounded-xl !py-0 font-mono text-[11px] uppercase"
                        aria-label="Código de cupón"
                      />
                      <button
                        type="submit"
                        disabled={couponLoading || !code.trim()}
                        className="rounded-xl border border-white/10 bg-white/[0.07] px-4 text-[10px] font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
                      >
                        {couponLoading ? '...' : 'Aplicar'}
                      </button>
                    </form>
                  )}
                  {couponError && <p className="mt-2 text-[9px] text-rose-300">{couponError}</p>}
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-white/75">¿Con cuál pagar?</p>
                    <span className="text-[8px] uppercase tracking-[0.14em] text-white/25">Elige uno</span>
                  </div>
                  <div className="grid gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <PaymentMethodOption
                        key={method.value}
                        method={method.value}
                        settings={settings}
                        selected={payMethod === method.value}
                        onSelect={() => setPayMethod(method.value)}
                      />
                    ))}
                  </div>
                  {(() => {
                    const details = getPaymentDetails(payMethod, settings)
                    const payLink = buildWhatsAppLink(
                      settings.whatsAppNumber,
                      `Hola ${settings.companyName}, quiero pagar mi carrito por ${details.label}. Total: ${formatCurrency(cartTotal)}. Adjunto mi comprobante.`,
                    )
                    return (
                      <div className="mt-3 space-y-2">
                        <a
                          href={payLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500 px-4 py-2.5 text-[11px] font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-110"
                        >
                          <MessageCircle size={14} />
                          Enviar comprobante por WhatsApp
                        </a>
                        <p className="flex items-start gap-1.5 text-[8px] leading-4 text-white/25">
                          <LockKeyhole size={9} className="mt-0.5 shrink-0" />
                          Selecciona el método, copia el dato, paga y adjunta tu ticket al enviar el mensaje.
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            <footer className="shrink-0 border-t border-white/[0.08] bg-[#0a0a14] px-5 py-4">
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-white/45">
                  <span>Subtotal</span>
                  <span className="tabular">{formatCurrency(cartSubtotal)}</span>
                </div>
                {coupon && (
                  <div className="flex items-center justify-between text-emerald-300/80">
                    <span>Cupón {coupon.code}</span>
                    <span className="tabular">-{formatCurrency(couponAmount)}</span>
                  </div>
                )}
                <div className="flex items-end justify-between border-t border-white/[0.08] pt-2.5">
                  <div>
                    <p className="text-xs font-medium text-white/70">Total</p>
                    <p className="text-[8px] text-white/25">Impuestos incluidos · MXN</p>
                  </div>
                  <p className="font-display text-2xl font-bold tracking-tight text-white tabular">
                    {formatCurrency(cartTotal)}
                  </p>
                </div>
              </div>

              {user ? (
                <p className="mt-3.5 flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-4 py-2.5 text-[11px] font-medium text-white/70">
                  <User size={13} className="text-accent" />
                  Comprando como <strong className="font-semibold text-white">{profile?.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'cliente'}</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeCart()
                    onAccount?.()
                  }}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold text-white/65 transition hover:border-white/20 hover:text-white"
                >
                  <User size={13} />
                  Crear cuenta / Iniciar sesión
                </button>
              )}
              <button type="button" onClick={openCheckout} className="btn-primary mt-2 w-full">
                Finalizar compra
                <ArrowRight size={15} />
              </button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[8px] text-white/25">
                <LockKeyhole size={9} />
                Pago seguro · Confirmación y soporte por WhatsApp
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
