import { ArrowUpRight, Facebook, Instagram, Mail, MessageCircle, ShieldCheck, Sparkles, Youtube } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { CONTACT_HOURS, CONTACT_PHONE, CONTACT_PHONE_HREF } from '../lib/contact'
import { buildWhatsAppLink } from '../lib/pricing'
import { scrollToId } from '../lib/hooks'
import { Logo } from './Logo'

const shopLinks = [
  { label: 'Catálogo', href: '#catalogo' },
  { label: 'Promos', href: '#/promos' },
  { label: 'Noticias', href: '#/noticias' },
  { label: 'Quiénes somos', href: '#nosotros' },
  { label: 'FAQ', href: '#/faq' },
]

// Nuestras redes sociales oficiales.
const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61591873076476', icon: Facebook },
  { label: 'Instagram', href: 'https://www.instagram.com/per_eclipse/?hl=es', icon: Instagram },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@eclipsehelp?si=Y2tlTeDtsaLRNpXZ',
    icon: Youtube,
  },
]

export function Footer() {
  const { settings } = useStore()
  const supportLink = buildWhatsAppLink(
    settings.whatsAppNumber,
    `Hola ${settings.companyName}, quiero información sobre sus licencias digitales.`,
  )
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 pb-6 sm:mt-24">
      <div className="page-shell">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-[linear-gradient(120deg,rgb(var(--primary-rgb)/.18),rgb(var(--secondary-rgb)/.08)_55%,rgb(var(--accent-rgb)/.1))] p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-secondary/20 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-primary/25 blur-[90px]" />

          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <span className="eyebrow !border-white/15 !bg-white/[0.06]">
                <Sparkles size={11} className="text-accent" />
                {settings.companyName}
              </span>
              <h2 className="mt-4 max-w-xl font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
                Tu próximo upgrade empieza hoy.
              </h2>
              <p className="mt-2 max-w-lg text-[11px] leading-6 text-white/50 sm:text-xs">
                Licencias digitales verificadas, pago a tu manera y soporte humano. Sin complicaciones.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button type="button" onClick={() => scrollToId('catalogo')} className="btn-primary">
                Explorar licencias
                <ArrowUpRight size={15} />
              </button>
              <a href={supportLink} target="_blank" rel="noreferrer" className="btn-secondary">
                <MessageCircle size={15} className="text-emerald-300" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 border-b border-white/[0.08] pb-8 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_1fr]">
          <div>
            <Logo onClick={() => scrollToId('inicio')} />
            <p className="mt-4 max-w-xs text-[10px] leading-5 text-white/35">
              Tienda digital de licencias para streaming, inteligencia artificial, edición, música y
              productividad. Entrega y soporte reales.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-[9px] text-white/30">
              <ShieldCheck size={11} className="text-emerald-300/70" />
              Compra protegida y verificada
            </div>
            <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Nuestras redes sociales
            </p>
            <div className="mt-2 flex items-center gap-2">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/45 transition hover:border-primary/40 hover:bg-primary/15 hover:text-white"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">Tienda</p>
            <ul className="mt-3 space-y-2">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[10px] text-white/45 transition hover:text-white"
                    onClick={(e) => {
                      if (link.href.startsWith('#/') || link.href === '#/') {
                        // hash route; let default handle
                      } else if (link.href.startsWith('#')) {
                        e.preventDefault()
                        const id = link.href.slice(1)
                        const el = document.getElementById(id)
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">Pagos</p>
            <ul className="mt-3 space-y-2 text-[10px] text-white/45">
              <li>BBVA · SPEI</li>
              <li>Mercado Pago</li>
              <li>OXXO</li>
              <li className="pt-1 text-[8px] text-white/25">Pago validado manualmente</li>
            </ul>
          </div>

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">Soporte</p>
            <div className="mt-3 space-y-2.5">
              <a
                href={supportLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[10px] text-white/45 transition hover:text-white"
              >
                <MessageCircle size={12} className="text-emerald-300/70" />
                WhatsApp de soporte
              </a>
              <a
                href={`mailto:${settings.supportEmail}`}
                className="flex items-center gap-2 text-[10px] text-white/45 transition hover:text-white"
              >
                <Mail size={12} className="text-secondary/70" />
                {settings.supportEmail}
              </a>
              <a
                href={CONTACT_PHONE_HREF}
                className="flex items-center gap-2 text-[10px] text-white/45 transition hover:text-white"
              >
                <MessageCircle size={12} className="text-emerald-300/70" />
                {CONTACT_PHONE}
              </a>
              <p className="text-[8px] leading-4 text-white/25">
                Horario de atención: {CONTACT_HOURS}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-5 text-[9px] text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings.companyName}. Todos los derechos reservados.</p>
          <div className="flex flex-wrap items-center gap-4">
            <span>Licencias digitales · techyuc.com</span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span>Hecho para tu próximo upgrade.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
