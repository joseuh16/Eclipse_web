import { useEffect, useState } from 'react'
import { MessageCircle, Zap } from 'lucide-react'
import { buildWhatsAppLink } from '../lib/pricing'
import type { Banner, PaymentSettings } from '../types'

interface AnnouncementBarProps {
  banners: Banner[]
  settings: PaymentSettings
}

const fallbackMessages = [
  { title: 'Entrega inmediata', discount: 'Licencias digitales verificadas' },
  { title: 'Hasta 35% OFF', discount: 'Streaming, IA y productividad' },
  { title: 'Soporte real', discount: 'Atención humana por WhatsApp' },
]

export function AnnouncementBar({ banners, settings }: AnnouncementBarProps) {
  const messages = banners.length
    ? banners.map((banner) => ({
        title: banner.discountText || 'Oferta de temporada',
        discount: banner.title,
      }))
    : fallbackMessages
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length)
    }, 4800)
    return () => window.clearInterval(timer)
  }, [messages.length])

  const current = messages[index % messages.length]
  const supportLink = buildWhatsAppLink(
    settings.whatsAppNumber,
    'Hola Eclipse Tech, necesito ayuda con una licencia digital.',
  )

  return (
    <div className="relative z-[60] border-b border-white/10 bg-[#07070f]/95">
      <div className="page-shell flex h-9 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-accent">
            <Zap size={11} fill="currentColor" />
          </span>
          <div key={index} className="flex min-w-0 items-center gap-2 overflow-hidden animate-fade-in">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
              {current.title}
            </span>
            <span className="h-3 w-px shrink-0 bg-white/15" />
            <span className="truncate text-[10px] text-white/55">{current.discount}</span>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <span className="text-[10px] text-white/40">Pago seguro · Entrega digital</span>
          <a
            href={supportLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[10px] font-medium text-white/65 transition hover:text-white"
          >
            <MessageCircle size={12} />
            Soporte WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
