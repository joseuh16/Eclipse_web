import { Film, Ticket, Zap } from 'lucide-react'

export function DoomsdayPromo() {
  return (
    <section id="doomsday" className="page-shell scroll-mt-28 pt-16 sm:pt-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a0a2e] via-[#0d0618] to-[#06060d] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              <Ticket size={12} /> Gana boletos para DoomsDay
            </span>
            <h2 className="mt-4 section-title">
              Avengers: Doomsday
              <span className="text-gradient"> ya viene en camino.</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
              El evento más esperado del Universo Marvel ya se acerca y en Eclipse te preparamos el terreno para el gran estreno.
              Ponte al día con todas las películas, series y sagas antes de que llegue la tormenta. Asegura tu cuenta a un precio de locura antes de que los cupos se agoten.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#catalogo" className="btn-primary">Saber más</a>
              <a
                href="https://wa.me/5219852022975?text=Hola%20Eclipse%20Tech,%20quiero%20participar%20en%20el%20sorteo%20de%20boletos%20para%20DoomsDay."
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                Participar por WhatsApp
              </a>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Film size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Regreso de Dragon Ball</p>
                  <p className="text-[11px] text-white/50">Hasta 20% de descuento en plataformas seleccionadas.</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-6 text-white/60">
                ¡Eleva tu ki al máximo y prepárate para la acción! Aprovecha nuestras promociones exclusivas para disfrutar de la nueva serie y de todas las batallas épicas.
              </p>
              <a href="#catalogo" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                Saber más <Zap size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
