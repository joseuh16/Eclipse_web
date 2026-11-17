import { Building2, CreditCard, Store, type LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import type { PaymentMethod, PaymentSettings } from '../types'
import { CopyButton } from './CopyButton'

export const PAYMENT_METHODS: Array<{
  value: PaymentMethod
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: 'BBVA',
    label: 'Transferencia BBVA',
    shortLabel: 'BBVA',
    description: 'SPEI · Validación manual',
    icon: Building2,
  },
  {
    value: 'MercadoPago',
    label: 'Mercado Pago',
    shortLabel: 'Mercado Pago',
    description: 'Transferencia a CLABE',
    icon: CreditCard,
  },
  {
    value: 'OXXO',
    label: 'Pago en OXXO',
    shortLabel: 'OXXO',
    description: 'Referencia en tienda',
    icon: Store,
  },
]

export function getPaymentDetails(method: PaymentMethod, settings: PaymentSettings) {
  if (method === 'BBVA') {
    return {
      label: 'Transferencia BBVA',
      valueLabel: 'CLABE BBVA',
      value: settings.clabeNumber,
      secondaryLabel: 'Beneficiario',
      secondary: settings.beneficiary,
      bank: settings.bankName,
    }
  }

  if (method === 'MercadoPago') {
    return {
      label: 'Mercado Pago',
      valueLabel: 'CLABE Mercado Pago',
      value: settings.mercadoPagoClabe,
      secondaryLabel: 'Beneficiario',
      secondary: settings.beneficiary,
      bank: 'Mercado Pago',
    }
  }

  return {
    label: 'Pago en OXXO',
    valueLabel: 'Referencia OXXO',
    value: settings.oxxoReference,
    secondaryLabel: 'Instrucción',
    secondary: 'Menciona tu número de orden al pagar.',
    bank: 'OXXO',
  }
}

export function PaymentMethodOption({
  method,
  settings,
  selected,
  onSelect,
}: {
  method: PaymentMethod
  settings: PaymentSettings
  selected: boolean
  onSelect: () => void
}) {
  const config = PAYMENT_METHODS.find((item) => item.value === method)
  const details = getPaymentDetails(method, settings)
  const Icon = config?.icon ?? Building2

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border transition',
        selected
          ? 'border-primary/55 bg-primary/[0.08] shadow-glow-sm'
          : 'border-white/10 bg-white/[0.025] hover:border-white/20',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-3 p-3.5 text-left"
        aria-pressed={selected}
      >
        <span
          className={cn(
            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border',
            selected
              ? 'border-primary/30 bg-primary/20 text-white'
              : 'border-white/10 bg-white/[0.04] text-white/55',
          )}
        >
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">{config?.label ?? details.label}</span>
            <span
              className={cn(
                'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                selected ? 'border-accent bg-accent' : 'border-white/25',
              )}
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
            </span>
          </span>
          <span className="mt-0.5 block text-[9px] uppercase tracking-[0.12em] text-white/35">
            {config?.description}
          </span>
          <span className="mt-2 block text-[9px] text-white/35">{details.valueLabel}</span>
          <span className="mt-0.5 block break-all font-mono text-[11px] font-medium text-white/80">
            {details.value}
          </span>
          {method !== 'OXXO' && (
            <span className="mt-1 block truncate text-[9px] text-white/30">
              {details.secondaryLabel}: {details.secondary}
            </span>
          )}
        </span>
      </button>
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3.5 py-2">
        <span className="truncate text-[9px] text-white/30">{details.bank}</span>
        <CopyButton value={details.value} label={details.valueLabel} />
      </div>
    </div>
  )
}

export function PaymentRows({ settings }: { settings: PaymentSettings }) {
  return (
    <div className="space-y-2">
      {PAYMENT_METHODS.map((method) => {
        const details = getPaymentDetails(method.value, settings)
        const Icon = method.icon
        return (
          <div
            key={method.value}
            className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] p-2.5"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/55">
              <Icon size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-white/75">{method.shortLabel}</p>
              <p className="mt-0.5 truncate font-mono text-[9px] text-white/40">{details.value}</p>
            </div>
            <CopyButton value={details.value} label={details.valueLabel} iconOnly />
          </div>
        )
      })}
    </div>
  )
}
