import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Package,
  Paperclip,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { useEscape } from '../lib/hooks'
import { mirrorOrderToFirestore } from '../lib/firebaseOrders'
import { saveClientOrder } from '../lib/clientOrders'
import {
  DURATION_LABELS,
  formatCurrency,
  formatDate,
  lineQuote,
} from '../lib/pricing'
import type {
  CreateOrderPayload,
  OrderConfirmation,
  OrderItemInput,
  PaymentMethod,
} from '../types'
import { CopyButton } from './CopyButton'
import { PAYMENT_METHODS, PaymentMethodOption, getPaymentDetails } from './PaymentDetails'
import { ProductImage } from './ProductImage'

export function CheckoutModal() {
  const {
    checkoutOpen,
    closeCheckout,
    openCart,
    cart,
    combos,
    settings,
    coupon,
    couponAmount,
    cartSubtotal,
    cartTotal,
    clearCart,
  } = useStore()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BBVA')
  const [accepted, setAccepted] = useState(false)
  const [adultConsent, setAdultConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const adultInCart = cart.some((line) =>
    line.kind === 'product' ? line.product.isAdultOnly : line.products.some((product) => product.isAdultOnly),
  )

  const close = () => {
    if (submitting) return
    closeCheckout()
    window.setTimeout(() => {
      setConfirmation(null)
      setError('')
    }, 200)
  }

  useEscape(checkoutOpen, close)

  useEffect(() => {
    if (checkoutOpen && confirmation) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [checkoutOpen, confirmation])

  if (!checkoutOpen) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (name.trim().length < 2) {
      setError('Escribe tu nombre completo para preparar tu pedido.')
      return
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Escribe un correo válido o déjalo vacío.')
      return
    }

    if (cart.length === 0) {
      setError('Tu carrito está vacío. Agrega una licencia para continuar.')
      return
    }

    if (adultInCart && !adultConsent) {
      setError('Debes confirmar que eres mayor de 18 años para comprar contenido +18.')
      return
    }

    if (!accepted) {
      setError('Acepta los términos y la política de privacidad para continuar.')
      return
    }

    const items: OrderItemInput[] = cart.map((line) =>
      line.kind === 'product'
        ? {
            productId: line.product.id,
            durationMonths: line.durationMonths,
            quantity: line.quantity,
          }
        : {
            productIds: line.products.map((product) => product.id),
            durationMonths: line.durationMonths,
            quantity: line.quantity,
          },
    )

    const payload: CreateOrderPayload = {
      customerName: name.trim(),
      customerEmail: email.trim() || undefined,
      customerPhone: phone.trim() || undefined,
      paymentMethod,
      couponCode: coupon?.code,
      adultConsent: adultInCart ? adultConsent : false,
      notes: notes.trim() || undefined,
      items,
    }

    setSubmitting(true)
    try {
      const response = await api.createOrder(payload)
      saveClientOrder(response)
      // Refleja el pedido en Firestore para que aparezca en el panel (best-effort).
      void mirrorOrderToFirestore(response, payload).catch(() => undefined)
      setConfirmation(response)
      clearCart()
      toast(`Pedido ${response.orderNumber} creado con éxito`, 'success')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No pudimos crear tu pedido. Intenta de nuevo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop flex items-center justify-center p-3 sm:p-6" role="presentation">
      <button
        type="button"
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Cerrar checkout"
      />

      <div
        ref={scrollRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="modal-card max-h-[94vh] max-w-5xl overflow-y-auto animate-scale-in"
      >
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0b0b16]/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-accent">
              {confirmation ? <CheckCircle2 size={17} /> : <LockKeyhole size={16} />}
            </span>
            <div>
              <h2 id="checkout-title" className="font-display text-sm font-semibold text-white sm:text-base">
                {confirmation ? 'Pedido confirmado' : 'Finalizar compra'}
              </h2>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-white/30">
                {confirmation ? 'Pendiente de verificación de pago' : 'Pago seguro · Activación digital'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="icon-btn h-9 w-9"
            aria-label="Cerrar checkout"
          >
            <X size={16} />
          </button>
        </header>

        {confirmation ? (
          <ConfirmationView
            confirmation={confirmation}
            onContinue={close}
            onCopy={() => toast('Número de orden copiado', 'success')}
          />
        ) : cart.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={30} className="mx-auto text-white/20" />
            <p className="mt-3 text-sm text-white/60">Tu carrito está vacío.</p>
            <button type="button" onClick={close} className="btn-secondary mt-4 !py-2.5 !text-xs">
              Volver a la tienda
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/[0.08] text-[9px] font-bold text-white/60">
                  01
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Tus datos
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="field-label">Nombre completo *</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="field"
                    placeholder="Ej. Mario Pérez"
                    autoComplete="name"
                    maxLength={160}
                    required
                  />
                </label>
                <label className="block">
                  <span className="field-label">Correo electrónico</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="field"
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    maxLength={160}
                  />
                  <span className="mt-1 block text-[8px] text-white/25">Opcional · para tu comprobante</span>
                </label>
                <label className="block">
                  <span className="field-label">WhatsApp / teléfono</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="field"
                    placeholder="55 1234 5678"
                    autoComplete="tel"
                    maxLength={30}
                  />
                  <span className="mt-1 block text-[8px] text-white/25">Opcional · agiliza la activación</span>
                </label>
              </div>

              <label className="mt-3 block">
                <span className="field-label">Notas para tu pedido (opcional)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="field min-h-20 resize-none"
                  placeholder="Correo de la cuenta, horario de contacto o alguna indicación..."
                  maxLength={1000}
                />
              </label>

              <div className="mt-6 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/[0.08] text-[9px] font-bold text-white/60">
                  02
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Método de pago
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {PAYMENT_METHODS.map((method) => (
                  <PaymentMethodOption
                    key={method.value}
                    method={method.value}
                    settings={settings}
                    selected={paymentMethod === method.value}
                    onSelect={() => setPaymentMethod(method.value)}
                  />
                ))}
              </div>

              <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-[9px] leading-5 text-white/35">
                {settings.paymentNote}
              </p>

              <div className="mt-5 space-y-3 border-t border-white/[0.08] pt-5">
                {adultInCart && (
                  <label className="flex cursor-pointer items-start gap-2.5 text-[10px] leading-5 text-white/55">
                    <input
                      type="checkbox"
                      checked={adultConsent}
                      onChange={(event) => setAdultConsent(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-[rgb(var(--accent-rgb))]"
                    />
                    <span>
                      Confirmo que soy mayor de 18 años y acepto adquirir contenido para adultos. *
                    </span>
                  </label>
                )}

                <label className="flex cursor-pointer items-start gap-2.5 text-[10px] leading-5 text-white/55">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-[rgb(var(--accent-rgb))]"
                  />
                  <span>
                    Acepto que mi pedido se procese de forma manual y confirmo que los datos de entrega son
                    correctos. *
                  </span>
                </label>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-[10px] leading-5 text-rose-200">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creando tu pedido...
                  </>
                ) : (
                  <>
                    Confirmar pedido · {formatCurrency(cartTotal)}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[8px] text-white/25">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={9} />
                  Datos protegidos
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles size={9} />
                  Confirmación inmediata
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={9} />
                  Soporte por WhatsApp
                </span>
              </div>
            </div>

            <aside className="border-t border-white/[0.08] bg-white/[0.022] p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Resumen del pedido
                </p>
                <button
                  type="button"
                  onClick={openCart}
                  className="text-[9px] font-medium text-white/35 underline-offset-4 transition hover:text-white hover:underline"
                >
                  Editar
                </button>
              </div>

              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {cart.map((line) => {
                  const quote = lineQuote(line, combos)
                  const name = line.kind === 'product' ? line.product.name : 'Combo Eclipse'
                  const image =
                    line.kind === 'product' ? line.product.imageUrl : line.products[0]?.imageUrl || ''
                  return (
                    <div key={line.id} className="flex items-center gap-2.5">
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/5">
                        <ProductImage src={image} alt={name} className="h-full w-full object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[10px] font-medium text-white/75">{name}</p>
                        <p className="text-[8px] text-white/30">
                          {line.quantity} × {DURATION_LABELS[line.durationMonths]}
                          {line.kind === 'combo' && quote.discountPercent > 0
                            ? ` · -${quote.discountPercent}%`
                            : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold tabular text-white/65">
                        {formatCurrency(quote.total)}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 space-y-1.5 border-t border-white/[0.08] pt-4 text-[10px]">
                <div className="flex justify-between text-white/40">
                  <span>Subtotal</span>
                  <span className="tabular">{formatCurrency(cartSubtotal)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-emerald-300/80">
                    <span>Cupón {coupon.code}</span>
                    <span className="tabular">-{formatCurrency(couponAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white/40">
                  <span>Envío digital</span>
                  <span className="text-emerald-300/80">Gratis</span>
                </div>
                <div className="flex items-end justify-between border-t border-white/[0.08] pt-3">
                  <span className="text-xs font-medium text-white/65">Total</span>
                  <span className="font-display text-xl font-bold text-white tabular">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/15 p-3">
                <p className="text-[9px] font-semibold text-white/60">¿Cómo funciona?</p>
                <ol className="mt-2 space-y-1.5 text-[8px] leading-4 text-white/30">
                  <li>1. Copia la CLABE o referencia del método elegido.</li>
                  <li>2. Realiza el pago por el monto exacto.</li>
                  <li>3. Envía tu comprobante por WhatsApp con tu número de orden.</li>
                  <li>4. Validamos y activamos tu licencia el mismo día.</li>
                </ol>
              </div>
            </aside>
          </form>
        )}
      </div>
    </div>
  )
}

function ConfirmationView({
  confirmation,
  onContinue,
  onCopy,
}: {
  confirmation: OrderConfirmation
  onContinue: () => void
  onCopy: () => void
}) {
  const details = getPaymentDetails(confirmation.paymentMethod, confirmation.settings)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!receipt) {
      setReceiptPreview(null)
      return
    }
    if (receipt.type.startsWith('image/')) {
      const url = URL.createObjectURL(receipt)
      setReceiptPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setReceiptPreview(null)
  }, [receipt])
  const method = PAYMENT_METHODS.find((item) => item.value === confirmation.paymentMethod)
  const Icon = method?.icon ?? Package

  return (
    <div className="p-5 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 size={30} />
            <span className="absolute inset-0 animate-ping rounded-full border border-emerald-400/20" />
          </div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
            Pedido recibido
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            ¡Gracias, {confirmation.customerName.split(' ')[0]}!
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[11px] leading-6 text-white/45">
            Tu pedido quedó registrado como <strong className="font-semibold text-white/70">pendiente de pago</strong>.
            Realiza la transferencia y envíanos el comprobante por WhatsApp para activar tus licencias.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Número de orden</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-wide text-white">
                {confirmation.orderNumber}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton
                value={confirmation.orderNumber}
                label="Número de orden"
                className="!px-3 !py-2"
              />
              <button
                type="button"
                onClick={onCopy}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
              >
                Copiar
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-white/[0.08] pt-3 text-[9px] text-white/35">
            <span>{formatDate(confirmation.createdAt)}</span>
            <span>
              Total: <strong className="text-white/75">{formatCurrency(confirmation.totalAmount)}</strong>
            </span>
            <span>Método: {method?.label ?? confirmation.paymentMethod}</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/[0.055] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <Icon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-white/85">
                Paga {formatCurrency(confirmation.totalAmount)} por {details.label}
              </p>
              <p className="mt-1 text-[9px] text-white/35">{details.valueLabel}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="break-all font-mono text-sm font-semibold tracking-wide text-white">
                  {details.value}
                </p>
                <CopyButton value={details.value} label={details.valueLabel} />
              </div>
              <p className="mt-2 text-[9px] leading-5 text-white/40">
                {confirmation.paymentMethod === 'OXXO'
                  ? 'Presenta esta referencia en cualquier OXXO y paga el monto exacto.'
                  : `${details.secondaryLabel}: ${details.secondary}. Realiza una transferencia por el monto exacto.`}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Comprobante de pago
          </p>
          <p className="mt-1 text-[10px] leading-5 text-white/45">
            Sube una imagen o PDF de tu comprobante. Lo adjuntarás manualmente al enviar el mensaje por WhatsApp.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="btn-secondary flex-1 cursor-pointer !py-2.5 !text-xs">
              <Paperclip size={13} />
              {receipt ? 'Cambiar archivo' : 'Adjuntar comprobante'}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setReceipt(file)
                }}
              />
            </label>
            {receipt && (
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-[10px] font-medium text-white/45 transition hover:text-white"
              >
                <X size={12} />
                Quitar
              </button>
            )}
          </div>
          {receipt && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
              {receiptPreview ? (
                <img src={receiptPreview} alt="Comprobante" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/40">
                  <Paperclip size={16} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-white/75">{receipt.name}</p>
                <p className="text-[9px] text-white/35">
                  {(receipt.size / 1024).toFixed(1)} KB · {receipt.type || 'archivo'}
                </p>
              </div>
            </div>
          )}
        </div>

        <a
          href={confirmation.whatsAppUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-16px_rgba(16,185,129,.8)] transition hover:-translate-y-0.5 hover:brightness-110"
        >
          <MessageCircle size={17} />
          Enviar comprobante por WhatsApp
        </a>

        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Tu pedido
          </p>
          <div className="mt-2.5 space-y-2">
            {confirmation.items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[10px] font-medium text-white/70">{item.name}</p>
                  <p className="mt-0.5 text-[8px] text-white/30">
                    {item.quantity} × {DURATION_LABELS[item.durationMonths]}
                    {item.comboDiscountPercent > 0 ? ` · Combo -${item.comboDiscountPercent}%` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] tabular text-white/60">
                  {formatCurrency(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>
          {confirmation.discountAmount > 0 && (
            <div className="mt-3 flex justify-between border-t border-white/[0.08] pt-2.5 text-[9px] text-emerald-300/75">
              <span>Descuento aplicado</span>
              <span>-{formatCurrency(confirmation.discountAmount)}</span>
            </div>
          )}
          <div className="mt-2.5 flex items-end justify-between border-t border-white/[0.08] pt-2.5">
            <span className="text-[10px] font-medium text-white/55">Total</span>
            <span className="font-display text-lg font-bold text-white tabular">
              {formatCurrency(confirmation.totalAmount)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[8px] leading-4 text-white/30">
          <ShieldCheck size={11} className="mt-0.5 shrink-0 text-secondary" />
          Tu pedido está pendiente de verificación. Conserva tu número de orden. Si tienes dudas, escríbenos
          a {confirmation.settings.supportEmail} o por WhatsApp.
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onContinue} className="btn-primary flex-1">
            Seguir comprando
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary flex-1"
          >
            Imprimir resumen
          </button>
        </div>
      </div>
    </div>
  )
}
