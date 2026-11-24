import { ArrowUpRight, CalendarDays, Sparkles, Tag } from 'lucide-react'
import { formatDate } from '../lib/pricing'
import type { Banner } from '../types'

interface PromosPageProps {
  banners: Banner[]
}

function isExternal(url: string) {
  return /^https?:\/\//i.test(url)
}

export function PromosPage({ banners }: PromosPageProps) {
  const promos = banners.filter((banner) => banner.isActive && !banner.isExpired)

  return (
    <div className="min-h-screen">
      <section className="page-shell scroll-mt-28 pt-16 sm:pt-24">
        <a
          href="#/"
          className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/50 transition hover:text-white"
        >
          ← Volver al inicio
        </a>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">
              <Tag size={13} />
              Promos vigentes
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Descuentos y novedades
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/50">
              Todo lo que el panel publica aparece aquí automáticamente. Elige una promo y aprovecha el descuento antes de que termine.
            </p>
          </div>
          <a href="#/cuenta" className="btn-secondary px-4 py-2.5 text-xs">
            Mi cuenta
          </a>
        </div>

        {promos.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-10 text-center">
            <Sparkles size={22} className="mx-auto text-accent" />
            <p className="mt-3 text-sm font-semibold text-white/80">Ahora mismo no hay promos activas</p>
            <p className="mt-1 text-xs text-white/40">Vuelve pronto: publicamos nuevas ofertas cada semana.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {promos.map((promo) => {
              const cta = promo.ctaUrl?.trim() || '#catalogo'
              return (
                <article
                  key={promo.id}
                  className="group overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
                >
                  <div className="relative h-44 overflow-hidden bg-black/30">
                    {promo.imageUrl ? (
                      <img
                        src={promo.imageUrl}
                        alt={promo.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-white/20">
                        <Tag size={36} />
                      </div>
                    )}
                    {promo.discountText ? (
                      <span className="absolute left-4 top-4 rounded-full border border-accent/30 bg-black/70 px-3 py-1.5 text-[11px] font-bold text-accent backdrop-blur-sm">
                        {promo.discountText}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-lg font-semibold text-white">{promo.title}</h2>
                    {promo.description ? (
                      <p className="mt-2 text-xs leading-6 text-white/50">{promo.description}</p>
                    ) : null}
                    {promo.expiryDate ? (
                      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-white/35">
                        <CalendarDays size={12} /> Vigente hasta {formatDate(promo.expiryDate)}
                      </p>
                    ) : null}
                    <a
                      href={cta}
                      {...(isExternal(cta) ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="btn-primary mt-5 w-full !py-2.5 !text-xs"
                    >
                      {promo.ctaText?.trim() || 'Ver descuentos'}
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
