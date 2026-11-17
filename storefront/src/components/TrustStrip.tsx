import { BadgeCheck, Headphones, ShieldCheck, Zap } from 'lucide-react'

const items = [
  {
    icon: Zap,
    title: 'Entrega en minutos',
    copy: 'Activación digital el mismo día',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: ShieldCheck,
    title: 'Pago protegido',
    copy: 'Transferencia, MP u OXXO',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: BadgeCheck,
    title: 'Licencias verificadas',
    copy: 'Productos activos y garantizados',
    color: 'text-emerald-300',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: Headphones,
    title: 'Soporte humano',
    copy: 'Atención real por WhatsApp',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
]

export function TrustStrip() {
  return (
    <section className="page-shell mt-7 sm:mt-9">
      <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] lg:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className={`flex items-center gap-3 px-4 py-4 sm:px-6 ${
                index % 2 === 1 ? 'border-l border-white/[0.08]' : ''
              } ${index >= 2 ? 'border-t border-white/[0.08] lg:border-t-0' : ''} ${
                index > 0 ? 'lg:border-l lg:border-white/[0.08]' : ''
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.bg} ${item.color}`}>
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-white/85">{item.title}</p>
                <p className="mt-0.5 truncate text-[9px] text-white/35 sm:text-[10px]">{item.copy}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
