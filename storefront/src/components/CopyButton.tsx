import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { copyText } from '../lib/clipboard'
import { cn } from '../lib/utils'

interface CopyButtonProps {
  value: string
  label: string
  iconOnly?: boolean
  className?: string
}

export function CopyButton({ value, label, iconOnly = false, className }: CopyButtonProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const success = await copyText(value)
    if (success) {
      setCopied(true)
      toast(`${label} copiado al portapapeles`, 'success')
      window.setTimeout(() => setCopied(false), 2200)
    } else {
      toast('No pudimos copiar. Selecciona el dato manualmente.', 'error')
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] text-[9px] font-semibold text-white/65 transition hover:border-white/25 hover:bg-white/[0.09] hover:text-white',
        iconOnly ? 'h-8 w-8' : 'px-3 py-1.5',
        copied && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
        className,
      )}
      aria-label={`Copiar ${label}`}
      title={`Copiar ${label}`}
    >
      {copied ? <Check size={11} strokeWidth={2.6} /> : <Copy size={11} />}
      {!iconOnly && (copied ? 'Copiado' : 'Copiar')}
    </button>
  )
}
