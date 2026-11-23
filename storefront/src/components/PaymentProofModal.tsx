import { useState } from 'react'
import { FileText, Loader2, Paperclip, Send, ShieldCheck, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useEscape, useLockBody } from '../lib/hooks'
import { buildWhatsAppLink, formatCurrency } from '../lib/pricing'
import type { PaymentProofDetail } from '../lib/events'

interface PaymentProofModalProps {
  open: boolean
  detail: PaymentProofDetail | null
  onClose: () => void
}

export function PaymentProofModal({ open, detail, onClose }: PaymentProofModalProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useLockBody(open)
  useEscape(open, onClose)

  if (!open || !detail) return null

  const text = [
    `Hola ${detail.companyName}, adjunto mi comprobante de pago.`,
    `Pedido: ${detail.orderNumber}`,
    `Total: ${formatCurrency(detail.total)}`,
    detail.customerEmail ? `Correo: ${detail.customerEmail}` : '',
    message.trim(),
  ]
    .filter(Boolean)
    .join('\n')

  const handleFile = (next: File | null) => {
    if (!next) return
    if (next.type !== 'application/pdf' && !next.name.toLowerCase().endsWith('.pdf')) {
      toast('Selecciona un archivo PDF.', 'error')
      return
    }
    if (next.size > 10 * 1024 * 1024) {
      toast('El PDF debe pesar menos de 10 MB.', 'error')
      return
    }
    setFile(next)
  }

  const send = async () => {
    setSending(true)
    try {
      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        file !== null &&
        navigator.canShare({ files: [file] })

      if (canShareFiles && file) {
        await navigator.share({
          files: [file],
          title: `Comprobante ${detail.orderNumber}`,
          text,
        })
        toast('Comprobante compartido por WhatsApp.', 'success')
      } else {
        const url = buildWhatsAppLink(
          detail.whatsAppNumber,
          `${text}\n\n(En WhatsApp adjunta el PDF desde el clip 📎)`,
        )
        window.open(url, '_blank', 'noopener,noreferrer')
        toast('Abrimos WhatsApp. Adjunta el PDF desde el clip 📎.', 'info')
      }
      setFile(null)
      setMessage('')
      onClose()
    } catch {
      // El usuario canceló el compartir: no hacemos nada.
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-md animate-fade-in"
        aria-label="Cerrar comprobante"
      />
      <div className="relative w-full max-w-md animate-scale-in rounded-t-3xl border border-white/[0.12] bg-[#0a0a14] p-5 shadow-[0_30px_100px_-30px_rgba(0,0,0,.95)] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-white">Enviar comprobante</h2>
            <p className="mt-1 text-[10px] text-white/40">
              Pedido {detail.orderNumber} · {formatCurrency(detail.total)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="field-label">Comprobante en PDF</span>
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-3">
            <Paperclip size={15} className="shrink-0 text-white/40" />
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
              className="min-w-0 flex-1 text-[10px] text-white/50 file:mr-2 file:rounded-lg file:border-0 file:bg-primary/20 file:px-2 file:py-1.5 file:text-[10px] file:text-white"
            />
          </div>
          {file ? (
            <span className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300">
              <FileText size={12} /> {file.name}
            </span>
          ) : null}
        </label>

        <label className="mt-4 block">
          <span className="field-label">Tu mensaje (opcional)</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ej. Ya realicé el pago por transferencia, este es mi comprobante."
            rows={3}
            className="field !rounded-xl !py-2.5 text-xs"
          />
        </label>

        <button type="button" onClick={send} disabled={sending} className="btn-primary mt-4 w-full">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Enviar por WhatsApp
        </button>

        <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-4 text-white/30">
          <ShieldCheck size={11} className="mt-0.5 shrink-0 text-secondary" />
          En celulares el PDF se comparte directo desde tu app de WhatsApp. En computadora abrimos el chat
          y solo tienes que adjuntar el PDF con el clip.
        </p>
      </div>
    </div>
  )
}
