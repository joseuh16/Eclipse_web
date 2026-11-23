import { useEffect, useState } from 'react'
import { Loader2, MessageSquareQuote, Send, Star } from 'lucide-react'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { openAccountModal } from '../lib/events'
import type { RtdbOpinion } from '../lib/rtdb'

export function ReviewsSection() {
  const { user, profile } = useCustomerAuth()
  const { toast } = useToast()
  const [opinions, setOpinions] = useState<RtdbOpinion[]>([])
  const [loading, setLoading] = useState(true)
  const [estrellas, setEstrellas] = useState(5)
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    api
      .getOpiniones()
      .then(setOpinions)
      .catch(() => setOpinions([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const submit = async () => {
    if (!user) {
      openAccountModal()
      return
    }
    if (comentario.trim().length < 5) {
      toast('Escribe un comentario de al menos 5 caracteres.', 'error')
      return
    }
    setSaving(true)
    try {
      await api.submitOpinion({
        uid: user.uid,
        nombre: profile?.displayName || user.displayName || user.email || 'Cliente',
        email: user.email || '',
        estrellas,
        comentario,
      })
      setComentario('')
      toast('¡Gracias! Tu opinión ya es pública.', 'success')
      load()
    } catch {
      toast('No pudimos guardar tu opinión. Inténtalo de nuevo.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="opiniones" className="page-shell scroll-mt-28 py-16 sm:py-24">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <span className="eyebrow">
            <MessageSquareQuote size={13} />
            Opiniones reales
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Lo que dice nuestra comunidad
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-7 text-white/50">
            Las opiniones se guardan directo en Firebase. Si ya tienes cuenta, puedes dejar la tuya.
          </p>

          <div className="mt-6 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[11px] font-semibold text-white/80">
              {user ? `Opinar como ${profile?.displayName?.split(' ')[0] || user.email?.split('@')[0]}` : 'Deja tu opinión'}
            </p>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEstrellas(star)}
                  aria-label={`${star} estrellas`}
                  className="transition hover:scale-110"
                >
                  <Star
                    size={20}
                    className={star <= estrellas ? 'fill-accent text-accent' : 'text-white/20'}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Cuéntanos cómo fue tu experiencia..."
              className="field mt-3 !rounded-xl !py-2.5 text-xs"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="btn-primary mt-3 w-full !py-2.5 !text-xs"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {user ? 'Publicar opinión' : 'Iniciar sesión para opinar'}
            </button>
          </div>
        </div>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          {loading ? (
            <div className="col-span-full flex items-center justify-center gap-2 py-12 text-xs text-white/40">
              <Loader2 size={16} className="animate-spin" /> Cargando opiniones…
            </div>
          ) : opinions.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-xs text-white/40">
              Aún no hay opiniones. ¡Puedes ser el primero!
            </div>
          ) : (
            opinions.slice(0, 8).map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"
              >
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={12}
                      className={index < item.estrellas ? 'fill-accent text-accent' : 'text-white/15'}
                    />
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-6 text-white/65">“{item.comentario}”</p>
                <p className="mt-4 text-[10px] font-semibold text-white/40">{item.nombre}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
