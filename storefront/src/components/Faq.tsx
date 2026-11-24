import { ChevronDown, MessageCircle } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { buildWhatsAppLink } from '../lib/pricing'
import { ReviewsSection } from './ReviewsSection'

const faqs = (companyName: string) => [
  {
    question: '¿Cómo recibo mi licencia después de pagar?',
    answer:
      'Al confirmar tu compra recibirás un número de orden. Copia la CLABE o referencia del método que elijas, paga el monto exacto y envía tu comprobante por WhatsApp. Validamos el pago y coordinamos la entrega y activación de tu licencia el mismo día.',
  },
  {
    question: '¿Cuánto tarda la activación?',
    answer:
      'La mayoría de los pedidos se validan en minutos dentro del horario de atención. En casos de alta demanda puede tomar algunas horas. Siempre recibirás seguimiento por WhatsApp con tu número de orden.',
  },
  {
    question: '¿Qué métodos de pago aceptan?',
    answer:
      'Aceptamos transferencia SPEI BBVA, transferencia a CLABE de Mercado Pago y pago en efectivo en OXXO. Al finalizar tu compra verás los datos exactos y podrás copiarlos en un clic.',
  },
  {
    question: '¿Puedo cambiar la duración de mi licencia?',
    answer:
      'Sí. Antes de pagar puedes elegir entre 1, 3, 6 y 12 meses. A mayor plazo, mayor ahorro. Si ya realizaste tu pedido, escríbenos por WhatsApp antes de activar la licencia para revisar opciones.',
  },
  {
    question: '¿Cómo funcionan los combos?',
    answer:
      'Selecciona 2 o más perfiles en el creador de combos. El descuento se aplica automáticamente de forma progresiva: 5% con 2 perfiles, 10% con 3 y hasta 15% con 4 o más. El descuento se valida al confirmar la orden.',
  },
  {
    question: '¿Qué pasa con el contenido +18?',
    answer:
      'La categoría +18 requiere verificación de mayoría de edad y no muestra contenido explícito. Al comprar una licencia de esta categoría deberás confirmar tu edad nuevamente en el checkout.',
  },
  {
    question: '¿Tienen garantía?',
    answer:
      'Todos nuestros productos incluyen acompañamiento y garantía de funcionamiento. Si tu licencia presenta un problema, contáctanos por WhatsApp o al correo de soporte con tu número de orden y te ayudamos a resolverlo.',
  },
  {
    question: '¿Cómo operamos?',
    answer:
      `En ${companyName} seguimos una estricta política de cero atajos y cero trampas: todo legal. No usamos tokens ni BINs; contratamos las cuentas directamente con cada plataforma y nuestros empleados configuran los perfiles, el idioma y el resto de ajustes. Por eso la entrega puede tardar algunos días.`,
  },
  {
    question: '¿Dónde operamos?',
    answer:
      `${companyName} es una empresa enfocada en Yucatán, pero hemos llegado más allá: contrataciones en Campeche, Quintana Roo, CDMX e incluso fuera de México.`,
  },
  {
    question: '¿Cómo cobramos?',
    answer:
      'Todos los planes son estrictamente mensuales (30 días desde que accedes a la cuenta). La entrega puede tardar hasta 3 días; si tardamos más de 7 días se puede solicitar reembolso completo. Tu mes no empieza hasta que tengas acceso a la cuenta.',
  },
  {
    question: '¿Cómo nos califican?',
    answer:
      `Hemos habilitado un espacio para calificar la calidad del servicio. ${companyName} tiene calidad y la gente lo sabe.`,
  },
]

export function Faq() {
  const { settings } = useStore()
  const supportLink = buildWhatsAppLink(
    settings.whatsAppNumber,
    `Hola ${settings.companyName}, tengo una duda sobre una licencia.`,
  )

  return (
    <>
      <section id="faq" className="page-shell scroll-mt-28 pt-16 sm:pt-24">
      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Preguntas frecuentes
          </p>
          <h2 className="mt-2 section-title">
            Todo claro,
            <span className="text-gradient"> sin sorpresas.</span>
          </h2>
          <p className="mt-3 max-w-sm text-[13px] leading-6 text-white/45">
            Resolvemos las dudas más comunes. Si necesitas algo más, el equipo está a un mensaje de
            distancia.
          </p>

          <a
            href={supportLink}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 transition hover:border-emerald-400/25 hover:bg-emerald-400/[0.055]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <MessageCircle size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/80">¿No encuentras tu respuesta?</p>
              <p className="mt-0.5 text-[9px] text-white/35">Escríbenos por WhatsApp</p>
            </div>
            <span className="ml-auto text-[9px] font-semibold text-emerald-300">Ayuda</span>
          </a>
        </div>

        <div className="space-y-2">
          {faqs(settings.companyName).map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] transition open:border-white/15 open:bg-white/[0.04]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left sm:px-5">
                <span className="text-[11px] font-semibold leading-5 text-white/75 sm:text-xs">
                  {faq.question}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/40 transition group-open:rotate-180 group-open:border-primary/30 group-open:text-white">
                  <ChevronDown size={13} />
                </span>
              </summary>
              <div className="px-4 pb-4 sm:px-5">
                <p className="border-t border-white/[0.06] pt-3 text-[10px] leading-6 text-white/40 sm:text-[11px]">
                  {faq.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
      </section>

      <ReviewsSection />
    </>
  )
}
