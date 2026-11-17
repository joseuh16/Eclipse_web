import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

export function AboutSection() {
  const [open, setOpen] = useState(false)
  return (
    <section id="nosotros" className="page-shell scroll-mt-28 pt-10 sm:pt-16">
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Quiénes somos</p>
        <h2 className="mt-2 section-title">
          Calidad y Entretenimiento
          <span className="text-gradient"> a tu alcance.</span>
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/60">
          Eclipse es una micro empresa fundada en agosto de 2024 con el objetivo de poner el mejor entretenimiento en las manos del yucateco promedio, procurando mantener la calidad de las plataformas a un precio competitivo.
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent transition hover:text-white"
        >
          {open ? 'Ver menos' : 'Ver más'}
          <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Quiénes somos</p>
            <p className="mt-2 text-xs leading-6 text-white/55">
              Nos dedicamos a revender perfiles de cuentas de streaming. No somos proveedores directos: dependemos de la estabilidad y los tiempos de las plataformas con las que contratamos. Seguimos una política estricta de cero atajos y cero trampas, todo legal.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Cómo operamos</p>
            <p className="mt-2 text-xs leading-6 text-white/55">
              Sin tokens ni BINs. Contratamos directamente con cada plataforma y configuramos los perfiles. La entrega puede tardar hasta 3 días; si tardamos más de 7 días se puede solicitar reembolso completo.
            </p>
            <a href="#/faq" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
              Ver más en FAQ →
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Cómo cobramos</p>
            <p className="mt-2 text-xs leading-6 text-white/55">
              Todos los planes son estrictamente mensuales (30 días desde que accedes a la cuenta). Tu mes no empieza hasta que tengas acceso a la cuenta.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:col-span-2 lg:col-span-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Contacto</p>
            <p className="mt-2 text-xs leading-6 text-white/55">
              985 202 2975 · pereclipsefeedback@gmail.com · Lun–Sáb, 9:00 a 20:00 hrs (CDMX).
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
