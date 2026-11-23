import { ArrowRight, CreditCard, MessageCircle, MousePointerClick, ShieldCheck } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { scrollToId } from '../lib/hooks'
import { buildWhatsAppLink } from '../lib/pricing'

const steps = [
  {
    number: '01',
    icon: MousePointerClick,
    title: 'Elige tu licencia',
    copy: 'Filtra por categoría, compara duraciones y aprovecha los combos. Todo claro antes de pagar.',
    accent: 'from-violet-500/20 to-fuchsia-500/5',
    iconColor: 'text-violet-300',
  },
  {
    number: '02',
    icon: CreditCard,
    title: 'Paga a tu manera',
    copy: 'BBVA, Mercado Pago u OXXO. Copia la CLABE o referencia en un clic y paga el monto exacto.',
    accent: 'from-cyan-400/20 to-blue-500/5',
    iconColor: 'text-cyan-300',
  },
  {
    number: '03',
    icon: MessageCircle,
    title: 'Recibe y activa',
    copy: 'Envía tu comprobante por WhatsApp. Validamos tu pago y coordinamos la activación el mismo día.',
    accent: 'from-emerald-400/20 to-teal-500/5',
    iconColor: 'text-emerald-300',
  },
]

export function HowItWorks() {
  const { settings } = useStore()
  const supportLink = buildWhatsAppLink(
    settings.whatsAppNumber,
    `Hola ${settings.companyName}, necesito ayuda para elegir una licencia.`,
  )

  return (
    <section id="como-funciona" className="page-shell scroll-mt-28 pt-16 sm:pt-24">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary/80">
            Así de simple
          </p>
          <h2 className="mt-2 section-title">
            De la selección a tu pantalla
            <span className="text-gradient"> en 3 pasos.</span>
          </h2>
          <p className="mt-3 max-w-md text-[13px] leading-6 text-white/45">
            Sin filas, sin sucursales y sin letras chiquitas. Compra tu licencia, paga y activa con
            acompañamiento real.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {['BBVA', 'Mercado Pago', 'OXXO'].map((method) => (
              <span
                key={method}
                className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-2.5 text-center text-[9px] font-semibold text-white/55"
              >
                {method}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.055] p-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <div>
                <p className="text-[11px] font-semibold text-white/80">Compra con respaldo</p>
                <p className="mt-1 text-[9px] leading-5 text-white/40">
                  Cada pedido queda registrado con número de orden y seguimiento por WhatsApp.
                </p>
                <a
                  href={supportLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-300 transition hover:text-emerald-200"
                >
                  Hablar con un asesor
                  <ArrowRight size={10} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <article
                key={step.number}
                className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${step.accent} p-5 transition duration-500 hover:border-white/20 sm:p-6`}
              >
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/25 text-white/75 backdrop-blur">
                    <Icon size={20} className={step.iconColor} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold tracking-[0.2em] text-white/30">
                        {step.number}
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 max-w-lg text-[11px] leading-6 text-white/45">{step.copy}</p>
                  </div>
                </div>
                <span className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-white/[0.03] blur-2xl transition duration-500 group-hover:bg-white/[0.06]" />
              </article>
            )
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3">
            <p className="text-[9px] text-white/35">¿Primera compra? Usa el cupón de bienvenida.</p>
            <button
              type="button"
              onClick={() => scrollToId('catalogo')}
              className="flex items-center gap-1.5 text-[9px] font-semibold text-accent transition hover:text-white"
            >
              Ver licencias
              <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
