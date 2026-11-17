import { Play, Sparkles, Users, Zap } from 'lucide-react'

const benefits = [
  { icon: Sparkles, title: 'Catálogo exclusivo', text: 'Olvídate de perder horas buscando. Nuestro equipo organiza y filtra el mejor contenido multimedia para que siempre tengas algo increíble por descubrir.' },
  { icon: Zap, title: 'Reproducción fluida', text: 'Disfruta de reproductores optimizados de alta velocidad. Entregamos el contenido con la mejor fidelidad visual, estés donde estés.' },
  { icon: Users, title: 'Comunidad enorme', text: 'Únete a cientos de entusiastas que ya disfrutan de nuestra plataforma privada con acceso 24/7.' },
]

export function DalePlay() {
  return (
    <section id="dale-play" className="page-shell scroll-mt-28 pt-16 sm:pt-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1a2e] via-[#060d18] to-[#06060d] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-secondary/25 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
              <Play size={12} /> Dale Play
            </span>
            <h2 className="mt-4 section-title">
              Tu universo
              <span className="text-gradient"> multimedia.</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
              Un ecosistema para quienes buscan una experiencia multimedia premium. Beneficios Play para disfrutar de tu entretenimiento sin complicaciones.
            </p>
            <a href="#catalogo" className="btn-primary mt-6">Descubre Play</a>
          </div>
          <div className="grid gap-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary">
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{benefit.title}</p>
                      <p className="mt-1.5 text-xs leading-6 text-white/55">{benefit.text}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
