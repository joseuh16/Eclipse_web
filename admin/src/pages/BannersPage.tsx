import {
  ArrowUpRight,
  CalendarClock,
  ImageIcon,
  Megaphone,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  FormError,
  Modal,
  PageHeader,
  Spinner,
  Toggle,
} from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { formatShortDate, fromDateInput, toDateInput } from '../lib/utils'
import { uploadImage } from '../lib/upload'
import type { Banner, BannerInput } from '../types'

const EMPTY_FORM: BannerInput = {
  title: '',
  description: '',
  discountText: 'Hasta 35% OFF',
  expiryDate: null,
  isActive: true,
  imageUrl: '',
  ctaText: 'Ver ofertas',
  ctaUrl: '#catalogo',
  sortOrder: 0,
}

function toForm(banner: Banner): BannerInput {
  return {
    title: banner.title,
    description: banner.description,
    discountText: banner.discountText,
    expiryDate: banner.expiryDate,
    isActive: banner.isActive,
    imageUrl: banner.imageUrl,
    ctaText: banner.ctaText,
    ctaUrl: banner.ctaUrl,
    sortOrder: banner.sortOrder,
  }
}

export function BannersPage() {
  const { toast } = useToast()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerInput>(EMPTY_FORM)
  const [expiry, setExpiry] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Banner | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setBanners(await api.banners.list())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar los banners.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({ ...EMPTY_FORM, sortOrder: banners.length })
    setExpiry('')
    setFormError(null)
  }

  const openEdit = (banner: Banner) => {
    setCreating(false)
    setEditing(banner)
    setForm(toForm(banner))
    setExpiry(toDateInput(banner.expiryDate))
    setFormError(null)
  }

  const closeModal = () => {
    if (saving || uploading) return
    setCreating(false)
    setEditing(null)
    setFormError(null)
  }

  const handleImageUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setFormError(null)
    try {
      const url = await uploadImage(file, 'banners')
      setForm((current) => ({ ...current, imageUrl: url }))
      toast('Imagen subida correctamente')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos subir la imagen.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (form.title.trim().length < 3) {
      setFormError('El título debe tener al menos 3 caracteres.')
      return
    }
    if (form.imageUrl.trim() && !/^https?:\/\//i.test(form.imageUrl.trim())) {
      setFormError('La imagen debe ser una URL http(s) válida.')
      return
    }

    setSaving(true)
    try {
      const payload: BannerInput = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        discountText: form.discountText.trim(),
        imageUrl: form.imageUrl.trim(),
        ctaText: form.ctaText.trim() || 'Ver ofertas',
        ctaUrl: form.ctaUrl.trim() || '#catalogo',
        expiryDate: fromDateInput(expiry),
      }
      if (editing) {
        const updated = await api.banners.update(editing.id, payload)
        setBanners((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        toast('Banner actualizado')
      } else {
        const created = await api.banners.create(payload)
        setBanners((current) => [...current, created])
        toast('Banner creado')
      }
      closeModal()
      setSaving(false)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos guardar el banner.')
      setSaving(false)
    }
  }

  const handleToggle = async (banner: Banner) => {
    setTogglingId(banner.id)
    try {
      const updated = await api.banners.toggle(banner.id)
      setBanners((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast(updated.isActive ? 'Banner activado' : 'Banner desactivado', updated.isActive ? 'success' : 'info')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos actualizar el banner.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.banners.remove(deleting.id)
      setBanners((current) => current.filter((item) => item.id !== deleting.id))
      toast('Banner eliminado')
      setDeleting(null)
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos eliminar el banner.', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Campañas"
        title="Banners"
        description="Administra los mensajes promocionales del carrusel principal y su vigencia."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Nuevo banner
          </button>
        }
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
          <button type="button" className="btn-secondary mt-3" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-56" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Megaphone}
            title="Sin banners configurados"
            description="Agrega un banner para destacar descuentos de temporada en la tienda."
            action={
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus size={16} />
                Nuevo banner
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {banners.map((banner) => (
            <article key={banner.id} className="panel overflow-hidden">
              <div
                className="relative h-32 overflow-hidden border-b border-white/[0.07]"
                style={{
                  background:
                    'radial-gradient(20rem 10rem at 20% 0%, rgb(var(--primary-rgb) / .45), transparent 65%), radial-gradient(18rem 9rem at 90% 100%, rgb(var(--secondary-rgb) / .3), transparent 65%)',
                }}
              >
                {banner.imageUrl ? (
                  <>
                    <img
                      src={banner.imageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-45"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#08080f] via-[#08080f]/55 to-transparent" />
                  </>
                ) : null}
                <div className="relative flex h-full flex-col justify-center px-5">
                  {banner.discountText ? (
                    <span className="mb-1.5 w-fit rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                      {banner.discountText}
                    </span>
                  ) : null}
                  <h3 className="max-w-[80%] truncate font-display text-lg font-semibold text-white">
                    {banner.title}
                  </h3>
                  <p className="mt-0.5 max-w-[80%] truncate text-xs text-white/50">
                    {banner.description || 'Sin descripción'}
                  </p>
                </div>
                <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
                  {banner.isActive && !banner.isExpired ? (
                    <Badge tone="success">Visible</Badge>
                  ) : banner.isExpired ? (
                    <Badge tone="danger">Expirado</Badge>
                  ) : (
                    <Badge>Pausado</Badge>
                  )}
                  <span className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] text-white/50">
                    Orden {banner.sortOrder}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3 text-xs text-white/45">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock size={13} />
                    {banner.expiryDate ? `Expira ${formatShortDate(banner.expiryDate)}` : 'Sin vencimiento'}
                  </span>
                  {banner.ctaUrl ? (
                    <span className="flex items-center gap-1 truncate text-white/35">
                      <ArrowUpRight size={12} />
                      {banner.ctaText || 'Ver ofertas'}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={banner.isActive}
                      onChange={() => void handleToggle(banner)}
                      disabled={togglingId === banner.id}
                      label={`Activar ${banner.title}`}
                    />
                    <span className="text-[11px] text-white/35">Activo</span>
                    {togglingId === banner.id ? <Spinner size={13} /> : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => openEdit(banner)}
                      aria-label={`Editar ${banner.title}`}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                      onClick={() => setDeleting(banner)}
                      aria-label={`Eliminar ${banner.title}`}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? 'Editar banner' : 'Nuevo banner'}
        description="El orden define la posición en el carrusel: menor número aparece primero."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="banner-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : <Sparkles size={15} />}
              {editing ? 'Guardar cambios' : 'Crear banner'}
            </button>
          </>
        }
      >
        <form id="banner-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="banner-title" className="field-label">
              Título
            </label>
            <input
              id="banner-title"
              className="field"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Black Friday Eclipse"
              required
              minLength={3}
              maxLength={160}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="banner-description" className="field-label">
              Descripción
            </label>
            <textarea
              id="banner-description"
              className="field min-h-[80px] resize-y"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Licencias premium con entrega inmediata."
              maxLength={600}
            />
          </div>

          <div>
            <label htmlFor="banner-discount" className="field-label">
              Texto de descuento
            </label>
            <input
              id="banner-discount"
              className="field"
              value={form.discountText}
              onChange={(event) =>
                setForm((current) => ({ ...current, discountText: event.target.value }))
              }
              placeholder="Hasta 35% OFF"
              maxLength={80}
            />
          </div>

          <div>
            <label htmlFor="banner-expiry" className="field-label">
              Vigencia hasta (opcional)
            </label>
            <input
              id="banner-expiry"
              type="date"
              className="field"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="banner-image" className="field-label">
              Imagen del banner (subir o URL)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <ImageIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id="banner-image"
                  className="field pl-10"
                  value={form.imageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="https://… o sube un archivo"
                  maxLength={1000}
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Spinner size={14} /> : <Upload size={15} />}
                {uploading ? 'Subiendo…' : 'Subir imagen'}
              </button>
            </div>
            {form.imageUrl ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                <img src={form.imageUrl} alt="Vista previa del banner" className="aspect-[16/9] w-full object-cover" />
              </div>
            ) : null}
            <p className="mt-1.5 text-[11px] text-white/35">
              Puedes subir la imagen desde tu equipo (Firebase Storage) o pegar una URL.
            </p>
          </div>

          <div>
            <label htmlFor="banner-cta-text" className="field-label">
              Texto del botón
            </label>
            <input
              id="banner-cta-text"
              className="field"
              value={form.ctaText}
              onChange={(event) => setForm((current) => ({ ...current, ctaText: event.target.value }))}
              placeholder="Ver ofertas"
              maxLength={60}
            />
          </div>

          <div>
            <label htmlFor="banner-cta-url" className="field-label">
              Destino del botón
            </label>
            <input
              id="banner-cta-url"
              className="field"
              value={form.ctaUrl}
              onChange={(event) => setForm((current) => ({ ...current, ctaUrl: event.target.value }))}
              placeholder="#catalogo"
              maxLength={300}
            />
          </div>

          <div>
            <label htmlFor="banner-sort" className="field-label">
              Orden
            </label>
            <input
              id="banner-sort"
              type="number"
              min={0}
              max={999}
              className="field"
              value={form.sortOrder}
              onChange={(event) =>
                setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div>
              <p className="text-sm font-medium text-white/80">Banner activo</p>
              <p className="mt-0.5 text-[11px] text-white/35">Se muestra si no está expirado.</p>
            </div>
            <Toggle
              checked={form.isActive}
              onChange={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
              label="Banner activo"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar banner"
        description={`¿Seguro que quieres eliminar “${deleting?.title ?? ''}”? Dejará de mostrarse en la tienda.`}
        confirmLabel="Eliminar"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
