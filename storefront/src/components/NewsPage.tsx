import { ArrowRight, Calendar, Newspaper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface NewsItem {
  slug: string
  title: string
  date: string
  excerpt: string
  image: string
  body: string[]
}

interface NewsItem {
  slug: string
  title: string
  date: string
  excerpt: string
  image: string
  body: string[]
}

const news: NewsItem[] = [
  {
    slug: 'nebula-core',
    title: 'Presentamos Nébula Core',
    date: '2026-11-10',
    excerpt:
      'Nuestro nuevo sistema para la gestión y control de cuentas y perfiles de streaming. Visualiza correos, contraseñas, fechas de pago y crea tus propios combos.',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80',
    body: [
      'Nébula Core es el siguiente paso en la evolución de Eclipse. Un ecosistema pensado para quienes buscan una experiencia multimedia premium.',
      'Ahora podrás visualizar los correos, contraseñas y perfiles de las cuentas que tengas contratadas, gestionar tus datos personales y ver en todo momento tus fechas de pago y métodos de pago.',
      'Además, tendrás independencia para crear tus propios combos con las plataformas que quieras, los meses que quieras y con un descuento automático.',
      'Y mucho más: descuentos, promociones y plataformas exclusivas dirigidas solo para ti.',
    ],
  },
  {
    slug: 'doomsday',
    title: 'Gana boletos para DoomsDay',
    date: '2026-11-08',
    excerpt:
      'El evento más esperado del Universo Marvel ya se acerca. Ponte al día con todas las películas y series antes de que llegue la tormenta.',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    body: [
      'Avengers: Doomsday ya viene en camino y en Eclipse te preparamos el terreno para el gran estreno.',
      'Ponte al día con todas las películas, series y sagas antes de que llegue la tormenta. Asegura tu cuenta a un precio de locura antes de que los cupos se agoten.',
      'Participa en el sorteo de boletos por WhatsApp y no te quedes fuera del evento del año.',
    ],
  },
  {
    slug: 'dragon-ball',
    title: 'Regreso de Dragon Ball: hasta 20% de descuento',
    date: '2026-11-05',
    excerpt:
      '¡Eleva tu ki al máximo! Promociones exclusivas en plataformas seleccionadas para disfrutar de la nueva serie y todas las batallas épicas.',
    image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1200&q=80',
    body: [
      'Para celebrar el esperado regreso de tus saiyajines favoritos, te traemos hasta un 20% de descuento en plataformas seleccionadas.',
      'Aprovecha nuestras promociones exclusivas para disfrutar de la nueva serie y de todas las batallas épicas.',
      'Válido por tiempo limitado. Consulta las plataformas participantes en el catálogo.',
    ],
  },
]

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date)
}

export function NewsPage({ slug }: { slug?: string }) {
  const [articles, setArticles] = useState<NewsItem[]>(news)

  useEffect(() => {
    let cancelled = false
    void api.content.get().then((response) => {
      if (cancelled) return
      const fetched = response.news.filter((item) => item.title).map((item) => ({
        slug: item.slug,
        title: item.title,
        date: item.date,
        excerpt: item.excerpt,
        image: item.imageUrl,
        body: item.body,
      }))
      setArticles(fetched.length > 0 ? fetched : news)
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const selected = slug ? articles.find((item) => item.slug === slug) : undefined

  if (slug && selected) {
    return (
      <section className="page-shell scroll-mt-28 pt-16 sm:pt-24">
        <a
          href="#/noticias"
          className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/50 transition hover:text-white"
        >
          ← Volver a noticias
        </a>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <img
              src={selected.image}
              alt={selected.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
              <Newspaper size={12} /> Noticias
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
              {selected.title}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-[11px] text-white/40">
              <Calendar size={12} /> {formatDate(selected.date)}
            </p>
            <div className="mt-6 space-y-4 text-sm leading-7 text-white/65">
              {selected.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <a href="#catalogo" className="btn-primary mt-8">Explorar licencias</a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-shell scroll-mt-28 pt-16 sm:pt-24">
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Noticias</p>
        <h1 className="mt-2 section-title">
          Lo nuevo de <span className="text-gradient">Eclipse.</span>
        </h1>
        <p className="mt-3 max-w-xl text-[13px] leading-6 text-white/45">
          Novedades, promociones y anuncios de nuestro ecosistema. Mantente al día con todo lo que viene.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((item) => (
          <article
            key={item.slug}
            className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] transition duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
          >
            <a href={`#/noticias/${item.slug}`} className="block">
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <p className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/30">
                  <Calendar size={11} /> {formatDate(item.date)}
                </p>
                <h2 className="mt-2 font-display text-lg font-semibold leading-tight text-white transition group-hover:text-white/80">
                  {item.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-[11px] leading-6 text-white/50">{item.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                  Leer más <ArrowRight size={12} />
                </span>
              </div>
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
