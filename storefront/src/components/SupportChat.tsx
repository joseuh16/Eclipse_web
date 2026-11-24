import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, ExternalLink, MessageCircle, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { buildChatKnowledge, getChatReply, type ChatAction, type ChatReply } from '../lib/chatbot'
import { useEscape } from '../lib/hooks'
import { buildWhatsAppLink } from '../lib/pricing'

type ChatMessage = ChatReply & {
  id: number
  role: 'bot' | 'user'
}

const WELCOME_QUICK_REPLIES = ['Precios y planes', 'Métodos de pago', 'Horarios y contacto'] as const
const QUICK_ACTIONS = [...WELCOME_QUICK_REPLIES, 'Hablar con asesor'] as const

let nextId = 1
function makeMessage(partial: Omit<ChatMessage, 'id'>): ChatMessage {
  return { id: nextId++, ...partial }
}

/**
 * Widget flotante del asistente.
 * - Sin API externa: las respuestas salen de `lib/chatbot.ts`.
 * - Se cierra con Escape y vuelve a abrirse en el mismo estado.
 */
export function SupportChat() {
  const { settings } = useStore()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])

  const knowledge = useMemo(
    () =>
      buildChatKnowledge(
        settings,
        buildWhatsAppLink(
          settings.whatsAppNumber,
          `Hola ${settings.companyName}, necesito ayuda con mi compra.`,
        ),
      ),
    [settings],
  )

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    makeMessage({
      role: 'bot',
      text: `¡Hola! Soy el asistente de ${settings.companyName || 'Eclipse Tech'}. Solo respondo con información de esta página: compras, pagos, entregas, descuentos, promos y contacto. ¿Qué necesitas?`,
      quickReplies: [...WELCOME_QUICK_REPLIES],
    }),
  ])

  useEscape(open, () => setOpen(false))

  // Scroll automático al último mensaje (y también cuando aparece "escribiendo").
  useEffect(() => {
    if (!open) return
    const node = scrollRef.current
    if (!node) return
    const frame = window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages, typing, open])

  // Evita actualizar el estado si el widget se desmonta con un temporizador activo.
  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current = []
    },
    [],
  )

  const sendMessage = (raw: string) => {
    const text = raw.trim()
    if (!text || typing) return

    setInput('')
    setMessages((current) => [...current, makeMessage({ role: 'user', text })])
    setTyping(true)

    const reply = getChatReply(text, knowledge)
    const timer = window.setTimeout(() => {
      setMessages((current) => [...current, makeMessage({ role: 'bot', ...reply })])
      setTyping(false)
      timersRef.current = timersRef.current.filter((id) => id !== timer)
    }, 650)
    timersRef.current.push(timer)
  }

  const handleAction = (action: ChatAction) => {
    if ('href' in action) {
      window.open(action.href, action.href.startsWith('http') ? '_blank' : '_self', 'noopener,noreferrer')
      return
    }
    if ('route' in action) {
      setOpen(false)
      window.location.hash = action.route
      return
    }
    setOpen(false)
    window.setTimeout(() => {
      document.getElementById(action.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
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
          className="fixed bottom-20 right-3 z-40 flex max-h-[min(72vh,34rem)] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-[1.4rem] border border-white/[0.12] bg-[#0b0b16]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl sm:right-6"
          aria-label={`Asistente ${knowledge.companyName}`}
        >
          <header className="flex items-center gap-2.5 border-b border-white/[0.08] bg-[linear-gradient(120deg,rgb(var(--primary-rgb)/.25),transparent)] px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-primary">
              <Bot size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white">Asistente {knowledge.companyName}</p>
              <p className="flex items-center gap-1 text-[9px] text-emerald-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                En línea · solo info de esta página
              </p>
            </div>
            <Sparkles size={14} className="text-accent/70" />
          </header>

          <div
            ref={scrollRef}
            aria-live="polite"
            className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3.5"
          >
            {messages.map((item) => (
              <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-[11px] leading-5 ${
                    item.role === 'user'
                      ? 'rounded-br-md bg-primary text-white'
                      : 'rounded-bl-md border border-white/[0.07] bg-white/[0.04] text-white/70'
                  }`}
                >
                  <p className="whitespace-pre-line">{item.text}</p>

                  {item.quickReplies?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.quickReplies.map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          disabled={typing}
                          onClick={() => sendMessage(quick)}
                          className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[9px] font-semibold text-white/80 transition hover:bg-primary/20 disabled:opacity-40"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {item.actions?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.actions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => handleAction(action)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                        >
                          <ExternalLink size={10} />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-[10px] text-white/45">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" />
                  </span>
                  escribiendo…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.08] px-3 py-2.5">
            <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={typing}
                  onClick={() => sendMessage(action)}
                  className="shrink-0 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[9px] font-medium text-white/55 transition hover:border-primary/40 hover:text-white disabled:opacity-40"
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
                    sendMessage(input)
                  }
                }}
                placeholder="Escribe tu duda…"
                aria-label="Escribe tu duda"
                className="field h-9 flex-1 px-3 text-[11px]"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || typing}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white transition hover:brightness-110 disabled:opacity-40"
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
