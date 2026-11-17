import { BadgeCheck, CalendarClock, Lock, Sparkles, Users } from 'lucide-react'

const benefits = [
  { icon: Lock, title: 'Visualiza tus cuentas', text: 'Correos, contraseñas y perfiles de las plataformas que tengas contratadas.' },
  { icon: Users, title: 'Gestión de datos', text: 'Nombre, lugar de vivienda y datos personales para comunicarnos mejor contigo.' },
  { icon: Sparkles, title: 'Experiencia personalizada', text: 'Descuentos, promociones y plataformas exclusivas dirigidas solo para ti.' },
  { icon: CalendarClock, title: 'Fechas de pago a la mano', text: 'Visualiza en todo momento tus fechas de pago y métodos de pago.' },
  { icon: BadgeCheck, title: 'Combos independientes', text: 'Crea tus propios combos con las plataformas y meses que quieras, con descuento automático.' },
]

export function NebulaCore() {
  return (
    <section id="nebula" className="page-shell scroll-mt-28 pt-16 sm:pt-24">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
            Mi cuenta
          </span>
          <h2 className="mt-4 section-title">
            Tu cuenta,
            <span className="text-gradient"> tu control total.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
            Presentamos Nébula Core, nuestro nuevo sistema para la gestión y control de cuentas y perfiles de streaming.
            Visualiza correos, contraseñas, fechas de pago y crea tus propios combos desde un solo lugar.
          </p>
          <a href="#catalogo" className="btn-primary mt-6">Descubre Play</a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-white/20 hover:bg-white/[0.055]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon size={16} />
                </span>
                <p className="mt-3 text-sm font-semibold text-white">{benefit.title}</p>
                <p className="mt-1.5 text-xs leading-6 text-white/55">{benefit.text}</p>
              </div>
            )
          })}
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Y mucho más</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Visualización en todo momento de tus fechas de pago, independencia para crear tus propios combos y una experiencia personalizada con descuentos y promociones exclusivas.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
