import { Sparkles } from 'lucide-react'

export function Logo({
  compact = false,
  companyName = 'Eclipse Tech',
  logoUrl = '',
  subtitle = 'Control Panel',
}: {
  compact?: boolean
  companyName?: string
  logoUrl?: string
  subtitle?: string
}) {
  const name = companyName.trim() || 'Eclipse Tech'

  return (
    <span className="flex min-w-0 shrink-0 items-center gap-3">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] object-contain p-1"
        />
      ) : (
        <span className="relative grid h-10 w-10 place-items-center">
          <span
            className="absolute inset-0 rounded-full opacity-90 blur-[0.3px]"
            style={{
              background:
                'conic-gradient(from 140deg, rgb(var(--primary-rgb)), rgb(var(--secondary-rgb)), rgb(var(--accent-rgb)), rgb(var(--primary-rgb)))',
            }}
          />
          <span className="absolute inset-[3px] rounded-full bg-ink" />
          <span
            className="absolute h-[26px] w-[26px] rounded-full"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, rgb(255 255 255 / .95), rgb(var(--primary-rgb)) 32%, rgb(var(--secondary-rgb)) 100%)',
            }}
          />
          <span className="absolute h-[24px] w-[24px] translate-x-[5px] -translate-y-[4px] rounded-full bg-ink" />
          <span className="absolute inset-0 rounded-full border border-white/20" />
          <Sparkles
            size={9}
            className="absolute right-[3px] top-[4px] text-white drop-shadow"
            strokeWidth={2.4}
          />
        </span>
      )}
      <span className="min-w-0 leading-none">
        <span
          className={`block max-w-[11rem] truncate font-display font-bold uppercase tracking-[0.18em] text-white ${
            compact ? 'text-[13px]' : 'text-[15px]'
          }`}
        >
          {name}
        </span>
        <span className="mt-1 block truncate text-[8px] font-semibold uppercase tracking-[0.32em] text-white/45">
          {subtitle}
        </span>
      </span>
    </span>
  )
}
