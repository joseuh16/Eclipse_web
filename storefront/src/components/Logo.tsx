import { Sparkles } from 'lucide-react'

interface LogoProps {
  onClick?: () => void
  compact?: boolean
}

export function Logo({ onClick, compact = false }: LogoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex shrink-0 items-center gap-3 text-left"
      aria-label="Eclipse Tech, ir al inicio"
    >
      <span className="relative grid h-10 w-10 place-items-center">
        <span
          className="absolute inset-0 rounded-full opacity-90 blur-[0.3px] transition duration-500 group-hover:rotate-90"
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
      <span className="leading-none">
        <span className={`block font-display font-bold tracking-[0.22em] text-white ${compact ? 'text-[13px]' : 'text-[15px]'}`}>
          ECLIPSE
        </span>
        <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.34em] text-white/45">
          Digital Store
        </span>
      </span>
    </button>
  )
}
