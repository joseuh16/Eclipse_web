import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { api, SEASON_EMOJI, SEASON_LABELS } from '../lib/api'
import { scrollToId } from '../lib/hooks'
import type { Banner } from '../types'

interface HeroCarouselProps {
  banners: Banner[]
}

function fallbackBanner(site: {
  heroImageUrl: string
  heroTitle: string
  heroDescription: string
} | null): Banner {
  const content = site ?? {
    heroImageUrl:
      'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1400&q=80',
    heroTitle: 'Tu entretenimiento, sin límites',
    heroDescription:
      'Licencias digitales de streaming, IA y productividad con entrega inmediata, pago seguro y soporte real.',
  }
  return {
    id: 0,
    title: content.heroTitle,
    description: content.heroDescription,
    discountText: 'Hasta 35% OFF',
    expiryDate: null,
    isActive: true,
    imageUrl: content.heroImageUrl,
    ctaText: 'Explorar catálogo',
    ctaUrl: '#catalogo',
    sortOrder: 1,
    isExpired: false,
  }
}

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const { theme } = useStore()
  const [siteContent, setSiteContent] = useState<{
    heroImageUrl: string
    heroTitle: string
    heroDescription: string
  } | null>(null)
  const slides = useMemo(() => (banners.length > 0 ? banners : [fallbackBanner(siteContent)]), [banners, siteContent])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let cancelled = false
    void api.content.get().then((response) => {
      if (!cancelled) setSiteContent(response.site)
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setIndex(0)
  }, [slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, 6800)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  const banner = slides[index] ?? fallbackBanner(siteContent)
  const season = SEASON_LABELS[theme.themeKey] ?? 'Cyber Dark'
  const seasonEmoji = SEASON_EMOJI[theme.themeKey] ?? SEASON_EMOJI.base

  const go = (direction: number) => {
    setIndex((current) => (current + direction + slides.length) % slides.length)
  }

  return (
    <section id="inicio" className="relative scroll-mt-28 overflow-hidden pb-2 pt-6 sm:pt-9">
      <div className="page-shell">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a13]/70 shadow-card"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-0 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-[100px]" />
            <div className="absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-secondary/15 blur-[110px]" />
            <div className="absolute inset-0 bg-noise opacity-[0.055]" />
          </div>

          <div className="relative grid min-h-[590px] items-center gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.03fr_0.97fr] lg:gap-4 lg:px-12 lg:py-12">
            <div key={`copy-${banner.id}-${index}`} className="relative z-10 animate-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow !border-primary/25 !bg-primary/10 !text-white/80">
                  <span aria-hidden className="text-sm leading-none drop-shadow">
                    {seasonEmoji}
                  </span>
                  Temporada · {season}
                </span>
                <span className="chip !border-emerald-400/20 !bg-emerald-400/10 !text-emerald-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Tienda en línea
                </span>
              </div>

              <h1 className="mt-6 max-w-[15ch] text-balance font-display text-[2.55rem] font-semibold leading-[1.03] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.1rem]">
                {banner.title}
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-sm leading-7 text-white/55 sm:text-[15px]">
                {banner.description}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => scrollToId('catalogo')} className="btn-primary group">
                  {banner.ctaText || 'Explorar catálogo'}
                  <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                </button>
                <button type="button" onClick={() => scrollToId('combos')} className="btn-secondary">
                  <Sparkles size={15} className="text-accent" />
                  Crear mi combo
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[11px] text-white/45">
                <span className="flex items-center gap-1.5">
                  <Zap size={12} className="text-accent" />
                  Activación el mismo día
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-secondary" />
                  Pago protegido
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck size={12} className="text-emerald-300" />
                  Licencias verificadas
                </span>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['L', 'M', 'A', 'R'].map((letter, position) => (
                    <span
                      key={letter}
                      className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#0a0a13] text-[10px] font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, rgb(var(--primary-rgb) / ${0.9 - position * 0.13}), rgb(var(--secondary-rgb) / ${0.7 - position * 0.1}))`,
                      }}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 text-accent" aria-label="Calificación 5 de 5">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <span key={star} className="text-[11px]">
                        â˜…
                      </span>
                    ))}
                  </div>
                  <p className="mt-0.5 text-[10px] text-white/40">Clientes que ya renovaron su Eclipse</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[480px] lg:ml-auto">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-transparent to-secondary/25 blur-2xl" />
              <div className="relative aspect-[4/3.4] overflow-hidden rounded-[1.7rem] border border-white/15 bg-white/5 sm:aspect-[4/3.55] lg:aspect-[4/4.4]">
                <img
                  key={banner.imageUrl}
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="h-full w-full animate-fade-in object-cover"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-[#08080f]/10 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#08080f]/30 to-transparent" />

                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 backdrop-blur-xl">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80">
                    Oferta activa
                  </span>
                </div>

                <div className="absolute right-4 top-4 rounded-2xl border border-accent/30 bg-accent/95 px-3.5 py-2 text-center text-black shadow-glow-sm">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/60">Descuento</p>
                  <p className="text-sm font-extrabold leading-tight">{banner.discountText || 'Hasta 35%'}</p>
                </div>

                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/[0.12] bg-[#08080f]/75 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent/90">
                        Licencia digital
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">Entrega inmediata y soporte real</p>
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-secondary">
                      <CalendarDays size={17} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[9px] text-white/45">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={10} /> Compra segura
                    </span>
                    <span className="h-2.5 w-px bg-white/15" />
                    <span className="flex items-center gap-1">
                      <Zap size={10} /> Activación rápida
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute -left-3 top-12 hidden rotate-[-5deg] rounded-2xl border border-white/[0.12] bg-[#10101c]/90 px-3.5 py-2.5 shadow-card backdrop-blur-xl sm:block lg:-left-6">
                <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/35">Ahorro combo</p>
                <p className="mt-0.5 text-sm font-bold text-white">hasta 15% extra</p>
              </div>

              <div className="absolute -bottom-3 -right-2 hidden rotate-[4deg] items-center gap-2 rounded-2xl border border-white/[0.12] bg-[#10101c]/90 px-3.5 py-2.5 shadow-card backdrop-blur-xl sm:flex lg:-right-4">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <BadgeCheck size={14} />
                </span>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-white/35">Verificado</p>
                  <p className="text-[10px] font-semibold text-white">Pago 100% seguro</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between border-t border-white/[0.08] px-5 py-4 sm:px-8 lg:px-12">
            <div className="flex items-center gap-1.5">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.id ?? slideIndex}
                  type="button"
                  onClick={() => setIndex(slideIndex)}
                  aria-label={`Ir al banner ${slideIndex + 1}`}
                  aria-current={slideIndex === index}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    slideIndex === index ? 'w-8 bg-accent' : 'w-2.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
              <span className="ml-2 text-[9px] font-medium tabular text-white/30">
                {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => go(-1)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white"
                aria-label="Banner anterior"
              >
                <ArrowLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white"
                aria-label="Banner siguiente"
              >
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
