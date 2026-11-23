import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { buildWhatsAppLink } from '../lib/pricing'
import { useEscape } from '../lib/hooks'

type ChatLink = { label: string; href: string }

type ChatMessage = {
  id: number
  role: 'bot' | 'user'
  text: string
  link?: ChatLink
  goCatalog?: boolean
}

const QUICK_ACTIONS = [
  '¿Cómo compro?',
  'Métodos de pago',
  'Mi pedido',
  '+18 y verificación',
  'Hablar con asesor',
] as const

let nextId = 1
function message(partial: Omit<ChatMessage, 'id'>): ChatMessage {
  return { id: nextId++, ...partial }
}

export function SupportChat() {
  const { settings } = useStore()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const supportLink = buildWhatsAppLink(
    settings.whatsAppNumber,
    `Hola ${settings.companyName}, necesito ayuda con mi compra.`,
  )

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    message({
      role: 'bot',
      text: `¡Hola! Soy el asistente de ${settings.companyName}. Te ayudo con compras, pagos, entregas, descuentos de estudiante y verificación +18. ¿Qué necesitas?`,
    }),
  ])

  useEscape(open, () => setOpen(false))

  useEffect(() => {
    if (!open) return
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, open])

  const reply = (choice: string, echo = true) => {
    const push = (text: string, extra: Partial<ChatMessage> = {}) => {
      setMessages((current) => [...current, message({ role: 'bot', text, ...extra })])
    }

    if (echo) {
      setMessages((current) => [...current, message({ role: 'user', text: choice })])
    }

    switch (choice) {
      case '¿Cómo compro?':
        push(
          'Es muy fácil: 1) elige tu plataforma en el catálogo, 2) selecciona el plan y la duración, 3) agrega al carrito y completa tus datos, 4) paga por SPEI, Mercado Pago u OXXO y envía tu comprobante por WhatsApp. Te entregamos el acceso en cuanto se valida el pago.',
          { goCatalog: true },
        )
        break
      case 'Métodos de pago':
        push(
          `Aceptamos BBVA/SPEI, Mercado Pago y OXXO. ${settings.paymentNote}`,
          { link: { label: 'Enviar comprobante por WhatsApp', href: supportLink } },
        )
        break
      case 'Mi pedido':
        push(
          'Puedes revisar el número de orden, el estado y la fecha de pago en “Mi cuenta”. Guarda tu número de orden y envíanos el comprobante por WhatsApp para activarlo más rápido.',
          { link: { label: 'Abrir Mi cuenta', href: '#/cuenta' } },
        )
        break
      case '+18 y verificación':
        push(
          'Los productos +18 requieren confirmar mayoría de edad y subir una foto de tu credencial (INE o pasaporte) al finalizar la compra. Nuestro equipo la revisa en el panel antes de entregar el acceso; la foto se usa solo para verificar edad.',
        )
        break
      case 'Hablar con asesor':
        push('Claro, te conectamos por WhatsApp. Da clic abajo y un asesor humano te atiende.', {
          link: { label: 'Abrir WhatsApp', href: supportLink },
        })
        break
      default:
        push('Te compartimos el canal directo para que un asesor lo revise contigo.', {
          link: { label: 'Escribir por WhatsApp', href: supportLink },
        })
    }
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    const normalized = text.toLowerCase()

    let choice: (typeof QUICK_ACTIONS)[number] = 'Hablar con asesor'
    if (/precio|costo|cuanto|cuánto/.test(normalized)) choice = '¿Cómo compro?'
    else if (/pago|pagar|spei|oxxo|mercado/.test(normalized)) choice = 'Métodos de pago'
    else if (/pedido|orden|estado/.test(normalized)) choice = 'Mi pedido'
    else if (/18|adulto|credencial|ine|mayor/.test(normalized)) choice = '+18 y verificación'
    else if (/hola|buenas|información|informacion/.test(normalized)) choice = '¿Cómo compro?'

    setMessages((current) => [...current, message({ role: 'user', text })])
    reply(choice, false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-5 right-4 z-40 flex h-12 items-center gap-2 rounded-full border border-primary/40 bg-primary px-4 text-[11px] font-semibold text-white shadow-[0_10px_40px_-12px_rgb(var(--primary-rgb)/.9)] transition hover:-translate-y-0.5 hover:brightness-110 sm:right-6"
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de compras'}
        aria-expanded={open}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
        <span className="hidden sm:inline">{open ? 'Cerrar' : 'Asistente'}</span>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#06060d] bg-accent" />
        )}
      </button>

      {open && (
        <section
          className="fixed bottom-20 right-3 z-40 flex max-h-[70vh] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-[1.4rem] border border-white/[0.12] bg-[#0b0b16]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl sm:right-6"
          aria-label={`Asistente de compras ${settings.companyName}`}
        >
          <header className="flex items-center gap-2.5 border-b border-white/[0.08] bg-[linear-gradient(120deg,rgb(var(--primary-rgb)/.25),transparent)] px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-primary">
              <Bot size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white">Asistente {settings.companyName}</p>
              <p className="flex items-center gap-1 text-[9px] text-emerald-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                En línea · respuestas al instante
              </p>
            </div>
            <Sparkles size={14} className="text-accent/70" />
          </header>

          <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3.5">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-5 ${
                    item.role === 'user'
                      ? 'rounded-br-md bg-primary text-white'
                      : 'rounded-bl-md border border-white/[0.07] bg-white/[0.04] text-white/70'
                  }`}
                >
                  <p>{item.text}</p>
                  {item.link && (
                    <a
                      href={item.link.href}
                      target={item.link.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                      <MessageCircle size={11} />
                      {item.link.label}
                    </a>
                  )}
                  {item.goCatalog && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-white/70 transition hover:bg-white/10"
                    >
                      Ver catálogo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.08] px-3 py-2.5">
            <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => reply(action)}
                  className="shrink-0 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[9px] font-medium text-white/55 transition hover:border-primary/40 hover:text-white"
                >
                  {action}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    send()
                  }
                }}
                placeholder="Escribe tu duda…"
                aria-label="Escribe tu duda"
                className="field h-9 flex-1 px-3 text-[11px]"
              />
              <button
                type="button"
                onClick={send}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white transition hover:brightness-110"
                aria-label="Enviar mensaje"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[8px] text-white/20">
              <ShieldCheck size={9} />
              Asistente informativo · no pide datos de tarjeta
            </p>
          </div>
        </section>
      )}
    </>
  )
}
