import { ComboBuilder } from './ComboBuilder'

export function CombosPage() {
  return (
    <div className="min-h-screen">
      <section className="page-shell scroll-mt-28 pt-16 sm:pt-24">
        <a href="#/" className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/50 transition hover:text-white">
          ← Volver al inicio
        </a>
      </section>
      <ComboBuilder />
    </div>
  )
}
