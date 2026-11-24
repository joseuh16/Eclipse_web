/**
 * Motor del asistente local de Eclipse.
 *
 * Regla de oro: SOLO se responde con información que ya aparece en la web
 * (catálogo, FAQ, pie de página, Mi cuenta y promociones). Todo lo demás se
 * deriva al canal oficial. No hay llamadas a IA ni datos del sistema.
 */
import { CONTACT_EMAIL, CONTACT_HOURS, CONTACT_PHONE, CONTACT_PHONE_HREF, INSTAGRAM_URL } from './contact'
import type { PaymentSettings } from '../types'

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61591873076476'
const YOUTUBE_URL = 'https://youtube.com/@eclipsehelp?si=Y2tlTeDtsaLRNpXZ'

/** Acción que se renderiza como botón debajo de una respuesta. */
export type ChatAction =
  | { label: string; href: string }
  | { label: string; route: string }
  | { label: string; scrollTo: string }

export type ChatReply = {
  text: string
  actions?: ChatAction[]
  quickReplies?: string[]
}

export type ChatKnowledge = {
  companyName: string
  whatsappUrl: string
  supportEmail: string
  paymentNote: string
  studentDiscountPercent: number
  phone: string
  phoneHref: string
  hours: string
  instagramUrl: string
  facebookUrl: string
  youtubeUrl: string
}

/** Construye el contexto del bot a partir de la configuración cargada en Firebase. */
export function buildChatKnowledge(settings: PaymentSettings, whatsappUrl: string): ChatKnowledge {
  return {
    companyName: settings.companyName || 'Eclipse Tech',
    whatsappUrl,
    supportEmail: settings.supportEmail?.trim() || CONTACT_EMAIL,
    paymentNote:
      settings.paymentNote?.trim() ||
      'Envía tu comprobante por WhatsApp con tu número de orden para validar el pago.',
    studentDiscountPercent: Math.max(0, Math.min(100, settings.studentDiscountPercent || 0)),
    phone: CONTACT_PHONE,
    phoneHref: CONTACT_PHONE_HREF,
    hours: CONTACT_HOURS,
    instagramUrl: INSTAGRAM_URL,
    facebookUrl: FACEBOOK_URL,
    youtubeUrl: YOUTUBE_URL,
  }
}

const wa = (k: ChatKnowledge, label = 'Escribir por WhatsApp'): ChatAction => ({
  label,
  href: k.whatsappUrl,
})
const mail = (k: ChatKnowledge, label = 'Enviar correo'): ChatAction => ({
  label,
  href: `mailto:${k.supportEmail}`,
})
const call = (k: ChatKnowledge, label = `Llamar al ${k.phone}`): ChatAction => ({
  label,
  href: k.phoneHref,
})
const route = (label: string, hash: string): ChatAction => ({ label, route: hash })
const scroll = (label: string, id: string): ChatAction => ({ label, scrollTo: id })

/** Normaliza acentos y signos para que "¿Cuánto cuesta?" y "cuanto cuesta" coincidan. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pedidos de acciones que el asistente no puede ejecutar (ej. "hazme un código"). */
const CAPABILITY_PATTERNS = [
  /\b(puedes|puede|podrias)\s+(hacer|crear|escribir|generar|programar|codificar)\b/,
  /\b(haz|hacer|crea|crear|escribe|escribir|genera|generar|programa|programar|codifica|codificar)\s+(me\s+)?(un|una|el|la)?\s*(codigo|programa|script|app|pagina|web)\b/,
]

/** Intentos de romper las reglas. Nunca se menciona cómo funcionan internamente. */
const INJECTION_PATTERNS = [
  /ignora (todo|lo anterior|tus|las|estas|estos) (instrucciones|reglas|normas|prompt)/,
  /olvida (todo|lo anterior|tus instrucciones|las reglas)/,
  /revela (tus|las|muestrame las) instrucciones/,
  /muestrame (el|tu) prompt|show (me )?the prompt/,
  /modo desarrollador|developer mode|jailbreak|do anything now/,
  /actua como (otro|un|una) (bot|asistente|ia|agente)/,
  /sal de (tu|este) modo|no sigas (las|tus) reglas/,
  /eres un (bot|ia) (real|humano)|finge ser humano/,
]

type Intent = {
  id: string
  patterns: RegExp[]
  reply: (k: ChatKnowledge) => ChatReply
}

/**
 * Orden de evaluación: de lo más específico a lo más general.
 * El primero que coincide gana; si ninguno coincide, se usa el fallback.
 */
const INTENTS: Intent[] = [
  {
    id: 'human',
    patterns: [/\b(asesor|humano|persona|agente|wats|whatsapp|llamada|hablar)\b/],
    reply: (k) => ({
      text: 'Claro, te conecto con el equipo humano. Da clic abajo y cuéntales tu caso por WhatsApp.',
      actions: [wa(k, 'Abrir WhatsApp')],
    }),
  },
  {
    id: 'student',
    patterns: [/\b(estudiante|estudiantil|credencial|universidad|escuela|beca)\b/],
    reply: (k) => ({
      text: `Si eres estudiante, entra a Mi cuenta, marca la opción “Soy estudiante” y adjunta una foto de tu credencial. El panel la revisa y te avisamos en la misma página cuando se apruebe. El descuento se aplica automáticamente solo después de la aprobación.${
        k.studentDiscountPercent > 0
          ? ` Ahora mismo el descuento configurado es de ${k.studentDiscountPercent}%.`
          : ' El porcentaje lo define el panel.'
      }`,
      actions: [route('Ir a Mi cuenta', '#/cuenta'), wa(k)],
    }),
  },
  {
    id: 'adult',
    patterns: [/\b18\b|\bmayor de edad\b|\badulto\b|\bine\b|\bpasaporte\b|\bverificacion\b/],
    reply: (k) => ({
      text: 'Los productos +18 requieren confirmar mayoría de edad y subir una foto de tu credencial (INE o pasaporte) al finalizar la compra. Nuestro equipo la revisa desde Órdenes antes de entregar el acceso. La foto se usa únicamente para verificar la edad.',
      actions: [route('Ver mis pedidos', '#/cuenta'), wa(k)],
    }),
  },
  {
    id: 'order',
    patterns: [/\b(pedido|pedidos|orden|ordenes|estado|envio|entrega|recibi|no llega)\b/],
    reply: (k) => ({
      text: 'En Mi cuenta puedes ver el número de orden, el estado, la fecha de pago y los artículos. Guarda tu número de orden y envíanos el comprobante por WhatsApp para acelerar la validación.',
      actions: [route('Abrir Mi cuenta', '#/cuenta'), wa(k, 'Consultar mi pedido')],
    }),
  },
  {
    id: 'payment',
    patterns: [/\b(pago|pagar|pagos|spei|bbva|transferencia|clabe|mercado pago|mercadopago|oxxo|efectivo|comprobante)\b/],
    reply: (k) => ({
      text: `Aceptamos transferencia BBVA/SPEI, CLABE de Mercado Pago y pago en efectivo en OXXO. ${k.paymentNote} Después de validar el pago te entregamos el acceso y te enviamos las cuentas por correo.`,
      actions: [wa(k, 'Enviar comprobante'), scroll('Ver catálogo', 'catalogo')],
    }),
  },
  {
    id: 'combos',
    patterns: [/\b(combo|combos|combinar|perfiles)\b/],
    reply: () => ({
      text: 'Puedes elegir 2 o más perfiles en el creador de combos. El descuento es progresivo: 5% con 2 perfiles, 10% con 3 y hasta 15% con 4 o más. Se valida al confirmar la orden.',
      actions: [scroll('Crear combo', 'catalogo')],
    }),
  },
  {
    id: 'promos',
    patterns: [
      /\b(promo|promos|promocion|promociones|ofertas|descuentos|cupon)\b/,
      /\bcodigo\b.*\b(descuento|promo|cupon)\b/,
      /\b(descuento|promo|cupon)\b.*\bcodigo\b/,
    ],
    reply: () => ({
      text: 'Las promos se sincronizan automáticamente desde el panel y aparecen en la sección Promos. También publicamos ofertas de hasta 35% OFF y combos con hasta 15% extra. Si tienes un cupón, puedes aplicarlo en el carrito.',
      actions: [route('Ver descuentos', '#/promos'), scroll('Explorar catálogo', 'catalogo')],
    }),
  },
  {
    id: 'refund',
    patterns: [/\b(reembolso|devolucion|garantia|falla|no funciona|problema|queja)\b/],
    reply: (k) => ({
      text: 'Todos los productos incluyen acompañamiento y garantía de funcionamiento. Si tu licencia presenta un problema, escríbenos con tu número de orden y lo resolvemos. Si la entrega supera 7 días, puedes solicitar reembolso completo.',
      actions: [wa(k, 'Reportar un problema'), mail(k)],
    }),
  },
  {
    id: 'delivery',
    patterns: [/\b(activacion|activar|tarda|tiempo|dias|horas|mensual|mensuales|30 dias|entrega)\b/],
    reply: (k) => ({
      text: `La mayoría de los pedidos se validan en minutos dentro del horario de atención (${k.hours}). En alta demanda puede tomar algunas horas y siempre hay seguimiento por WhatsApp. La entrega puede tardar hasta 3 días; si pasamos 7 días puedes pedir reembolso. Los planes son mensuales (30 días desde que accedes a la cuenta): tu mes no empieza hasta que tengas acceso.`,
      actions: [route('Revisar mi pedido', '#/cuenta'), wa(k)],
    }),
  },
  {
    id: 'account',
    patterns: [/\b(cuenta|login|iniciar sesion|registro|registrarme|loguear|contrasena|correo)\b/],
    reply: (k) => ({
      text: 'Para comprar necesitas iniciar sesión. Escribe tu correo: si ya estás registrado te pedimos la contraseña; si no, te pedimos tus datos para crearte la cuenta. Desde Mi cuenta ves tus pedidos, tu descuento de estudiante y puedes cerrar sesión.',
      actions: [route('Abrir Mi cuenta', '#/cuenta'), wa(k)],
    }),
  },
  {
    id: 'prices',
    patterns: [/\b(precio|precios|cuesta|cuestan|costo|cuanto|tarifa|planes|duracion|meses)\b/],
    reply: () => ({
      text: 'Los precios dependen de la plataforma y la duración: puedes elegir 1, 3, 6 o 12 meses. En el catálogo ves el precio final de cada plan y las ofertas vigentes (hasta 35% OFF). Los combos suman hasta 15% extra.',
      actions: [scroll('Ver precios en el catálogo', 'catalogo'), route('Ver promos', '#/promos')],
    }),
  },
  {
    id: 'music',
    patterns: [/\b(musica|cancion|reproductor|spotify de la tienda)\b/],
    reply: () => ({
      text: 'Si el dueño activó música desde el panel, aparece un reproductor pequeño abajo a la izquierda. Nunca se reproduce automáticamente: tú decides cuándo darle play.',
    }),
  },
  {
    id: 'social',
    patterns: [/\b(instagram|facebook|youtube|redes|social)\b/],
    reply: (k) => ({
      text: 'Estas son nuestras redes oficiales: Instagram @per_eclipse, Facebook Eclipse y el canal de YouTube Eclipse Help.',
      actions: [
        { label: 'Instagram', href: k.instagramUrl },
        { label: 'Facebook', href: k.facebookUrl },
        { label: 'YouTube', href: k.youtubeUrl },
      ],
    }),
  },
  {
    id: 'contact',
    patterns: [/\b(contacto|horario|horarios|atencion|telefono|celular|llamar|correo|email|ubicacion|donde|yucatan|cdmx|direccion)\b/],
    reply: (k) => ({
      text: `Atendemos de ${k.hours} Teléfono: ${k.phone}. Correo: ${k.supportEmail}. Somos una micro empresa de Yucatán con clientes en Campeche, Quintana Roo y CDMX. Para respuesta inmediata, WhatsApp es el canal más rápido.`,
      actions: [wa(k, 'Abrir WhatsApp'), call(k), mail(k)],
    }),
  },
  {
    id: 'purchase',
    patterns: [/\b(comprar|compra|adquirir|pedir|licencia|licencias|catalogo|productos|servicios|netflix|streaming|ia|edicion)\b/],
    reply: (k) => ({
      text: `Es fácil: 1) elige el producto en el catálogo, 2) selecciona duración y cantidad, 3) inicia sesión y completa el checkout, 4) paga y envía tu PDF de comprobante por WhatsApp. Validamos el pago y te enviamos las cuentas por correo. Solo se puede comprar con sesión iniciada.`,
      actions: [scroll('Ir al catálogo', 'catalogo'), route('Iniciar sesión', '#/cuenta'), wa(k)],
    }),
  },
  {
    id: 'greeting',
    patterns: [/\b(hola|buenas|buen dia|buenas tardes|que tal|hey|informacion|ayuda)\b/],
    reply: (k) => ({
      text: `¡Hola! Soy el asistente de ${k.companyName}. Manejo solo la información de esta página: compras, pagos, entregas, descuentos, promos y contacto. Elige una opción o escribe tu duda.`,
      quickReplies: ['Precios y planes', 'Métodos de pago', 'Horarios y contacto'],
    }),
  },
]

function fallback(k: ChatKnowledge): ChatReply {
  return {
    text: `No tengo ese dato en la información de ${k.companyName}. Puedo ayudarte con compras, pagos, entregas, descuentos, promos y contacto. Para cualquier otra cosa, un asesor te responde por WhatsApp o al ${k.phone}.`,
    actions: [wa(k, 'Hablar con un asesor'), call(k), mail(k)],
  }
}

/** Punto de entrada: devuelve siempre una respuesta segura y basada en la web. */
export function getChatReply(input: string, k: ChatKnowledge): ChatReply {
  const text = normalize(input)
  if (!text) return fallback(k)

  if (INJECTION_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      text: 'Prefiero mantenerme en lo que conozco: la información de esta página. No puedo cambiar mis reglas ni compartir instrucciones internas. Si necesitas algo específico, te atienden por WhatsApp.',
      actions: [wa(k, 'Hablar con un asesor')],
    }
  }

  if (CAPABILITY_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      text: 'No puedo crear código ni ejecutar tareas: solo respondo preguntas con la información de esta página (compras, pagos, entregas, promos y contacto). Si necesitas ayuda técnica, un asesor te atiende por WhatsApp.',
      actions: [wa(k, 'Hablar con un asesor')],
    }
  }

  for (const intent of INTENTS) {
    if (intent.patterns.some((pattern) => pattern.test(text))) return intent.reply(k)
  }

  return fallback(k)
}
