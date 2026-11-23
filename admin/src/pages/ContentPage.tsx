import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Image as ImageIcon, Newspaper, Plus, Save, Trash2, Pencil } from 'lucide-react'
import { Badge, ConfirmDialog, EmptyState, FormError, Modal, PageHeader, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { uploadImage } from '../lib/upload'
import type { NewsItem, NewsInput, SiteContent, SiteContentInput } from '../types'

const EMPTY_SITE: SiteContentInput = {
  heroImageUrl: '',
  heroTitle: '',
  heroDescription: '',
}

const EMPTY_NEWS: NewsInput = {
  slug: '',
  title: '',
  date: new Date().toISOString().slice(0, 10),
  excerpt: '',
  imageUrl: '',
  body: [''],
}

function toNewsForm(item: NewsItem): NewsInput {
  return {
    slug: item.slug,
    title: item.title,
    date: item.date.slice(0, 10),
    excerpt: item.excerpt,
    imageUrl: item.imageUrl,
    body: item.body.length ? item.body : [''],
  }
}

function fromNewsInput(input: NewsInput): NewsInput {
  const paragraphs = input.body
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  return { ...input, body: paragraphs.length ? paragraphs : [''] }
}

export function ContentPage() {
  const { toast } = useToast()
  const [site, setSite] = useState<SiteContent | null>(null)
  const [siteForm, setSiteForm] = useState<SiteContentInput>(EMPTY_SITE)
  const [savingSite, setSavingSite] = useState(false)
  const [siteFormError, setSiteFormError] = useState<string | null>(null)

  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [newsError, setNewsError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [form, setForm] = useState<NewsInput>(EMPTY_NEWS)
  const [formError, setFormError] = useState<string | null>(null)
  const [savingNews, setSavingNews] = useState(false)
  const [deleting, setDeleting] = useState<NewsItem | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await api.content.get()
      setSite(response.site)
      setSiteForm({
        heroImageUrl: response.site.heroImageUrl,
        heroTitle: response.site.heroTitle,
        heroDescription: response.site.heroDescription,
      })
      setNews(response.news)
    } catch (caught) {
      setNewsError(caught instanceof Error ? caught.message : 'No pudimos cargar el contenido del sitio.')
    } finally {
      setLoadingNews(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSaveSite = async (event: FormEvent) => {
    event.preventDefault()
    setSiteFormError(null)
    if (!site) return
    if (siteForm.heroImageUrl.trim().length < 8) {
      setSiteFormError('La imagen del hero debe tener una URL válida o un archivo subido.')
      return
    }
    if (siteForm.heroTitle.trim().length < 3 || siteForm.heroTitle.trim().length > 120) {
      setSiteFormError('El título del hero debe tener entre 3 y 120 caracteres.')
      return
    }
    if (siteForm.heroDescription.trim().length > 300) {
      setSiteFormError('La descripción del hero no puede superar los 300 caracteres.')
      return
    }

    setSavingSite(true)
    try {
      const saved = await api.content.saveSite({
        heroImageUrl: siteForm.heroImageUrl.trim(),
        heroTitle: siteForm.heroTitle.trim(),
        heroDescription: siteForm.heroDescription.trim(),
      })
      setSite(saved)
      toast('Contenido del sitio guardado')
    } catch (caught) {
      setSiteFormError(caught instanceof Error ? caught.message : 'No pudimos guardar el contenido.')
    } finally {
      setSavingSite(false)
    }
  }

  const handleSiteFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadImage(file, 'site')
      setSiteForm((current) => ({ ...current, heroImageUrl: url }))
      toast('Imagen del hero subida')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No se pudo subir la imagen.', 'error')
    } finally {
      event.target.value = ''
    }
  }

  const openCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm(EMPTY_NEWS)
    setFormError(null)
  }

  const openEdit = (item: NewsItem) => {
    setCreating(false)
    setEditing(item)
    setForm(toNewsForm(item))
    setFormError(null)
  }

  const closeModal = () => {
    if (savingNews) return
    setCreating(false)
    setEditing(null)
    setFormError(null)
  }

  const handleNewsFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const target = editing ?? (creating ? { id: 0, slug: form.slug, title: form.title, date: form.date, excerpt: form.excerpt, imageUrl: form.imageUrl, body: form.body, createdAt: '' } : null)
    if (!file || !target) return
    try {
      const url = await uploadImage(file, 'site')
      setForm((current) => ({ ...current, imageUrl: url }))
      toast('Imagen de la noticia subida')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No se pudo subir la imagen.', 'error')
    } finally {
      event.target.value = ''
    }
  }

  const handleNewsSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const payload = fromNewsInput(form)
    if (payload.slug.trim().length < 2 || !/^[a-z0-9-]{2,40}$/.test(payload.slug.trim())) {
      setFormError('El slug debe tener entre 2 y 40 caracteres: minúsculas, números y guiones.')
      return
    }
    if (payload.title.trim().length < 5) {
      setFormError('El título de la noticia debe tener al menos 5 caracteres.')
      return
    }
    if (!payload.date) {
      setFormError('Selecciona una fecha para la noticia.')
      return
    }
    if (payload.body.filter((paragraph) => paragraph.trim()).length === 0) {
      setFormError('Escribe al menos un párrafo para la noticia.')
      return
    }

    setSavingNews(true)
    try {
      const data: NewsInput = {
        ...payload,
        slug: payload.slug.trim(),
        title: payload.title.trim(),
        excerpt: payload.excerpt.trim(),
        imageUrl: payload.imageUrl.trim(),
        body: payload.body.map((paragraph) => paragraph.trim()).filter(Boolean),
      }
      if (editing) {
        const updated = await api.content.news.update(editing.id, data)
        setNews((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        toast('Noticia actualizada')
      } else {
        const created = await api.content.news.create(data)
        setNews((current) => [created, ...current])
        toast('Noticia creada')
      }
      closeModal()
      setSavingNews(false)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos guardar la noticia.')
      setSavingNews(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.content.news.remove(deleting.id)
      setNews((current) => current.filter((item) => item.id !== deleting.id))
      toast('Noticia eliminada')
      setDeleting(null)
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos eliminar la noticia.', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Sitio público"
        title="Contenido e imágenes"
        description="Administra la imagen y textos de la portada del hero y las noticias que se publican en la tienda."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Nueva noticia
          </button>
        }
      />

      {newsError ? (
        <div className="mb-5">
          <FormError message={newsError} />
          <button type="button" className="btn-secondary mt-3" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <section className="panel mb-5 p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <ImageIcon size={17} />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-white">Portada del hero</h2>
            <p className="mt-0.5 text-xs leading-5 text-white/40">
              Imagen principal de la tienda cuando no hay banners activos.
            </p>
          </div>
        </div>

        {loadingNews ? (
          <div className="skeleton h-40" />
        ) : (
          <form className="space-y-4" onSubmit={(event) => void handleSaveSite(event)}>
            <FormError message={siteFormError} />
            <div>
              <span className="field-label">Imagen del hero</span>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <label className="field relative block overflow-hidden p-0">
                  <span className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    {siteForm.heroImageUrl ? (
                      <img
                        src={siteForm.heroImageUrl}
                        alt="Portada del hero"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={22} className="text-white/30" />
                    )}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void handleSiteFile(event)}
                    aria-label="Subir imagen del hero"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/55 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                    Subir imagen
                  </span>
                </label>
                <input
                  type="url"
                  className="field"
                  value={siteForm.heroImageUrl}
                  onChange={(event) => setSiteForm((current) => ({ ...current, heroImageUrl: event.target.value }))}
                  placeholder="https://… o sube una imagen"
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="content-hero-title">
                Título del hero
              </label>
              <input
                id="content-hero-title"
                className="field"
                value={siteForm.heroTitle}
                maxLength={120}
                onChange={(event) => setSiteForm((current) => ({ ...current, heroTitle: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="content-hero-description">
                Descripción del hero
              </label>
              <textarea
                id="content-hero-description"
                className="field min-h-[96px] resize-y"
                maxLength={300}
                value={siteForm.heroDescription}
                onChange={(event) => setSiteForm((current) => ({ ...current, heroDescription: event.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <button type="submit" className="btn-primary" disabled={savingSite}>
                {savingSite ? <Spinner size={14} /> : <Save size={15} />}
                Guardar contenido
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void load()}
                disabled={savingSite}
              >
                Recargar
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2">
            <Newspaper size={16} className="text-secondary" />
            <h2 className="font-display text-lg font-semibold text-white">Noticias</h2>
          </div>
          <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={openCreate}>
            <Plus size={13} />
            Nueva noticia
          </button>
        </div>

        {loadingNews ? (
          <div className="p-5">
            <div className="skeleton h-32" />
          </div>
        ) : news.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Sin noticias"
            description="Publica anuncios, novedades y campañas para tus visitantes."
            action={
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus size={15} />
                Nueva noticia
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="table-head">Título</th>
                  <th className="table-head">Slug</th>
                  <th className="table-head">Fecha</th>
                  <th className="table-head">Imagen</th>
                  <th className="table-head text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {news.map((item) => (
                  <tr key={item.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-4 py-3.5 text-sm text-white/80">{item.title}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-white/40">/{item.slug}</td>
                    <td className="px-4 py-3.5 text-xs text-white/45">{item.date}</td>
                    <td className="px-4 py-3.5">{item.imageUrl ? <Badge tone="primary">Imagen</Badge> : <span className="text-xs text-white/30">Sin imagen</span>}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button type="button" className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => openEdit(item)}>
                        <Pencil size={12} />
                        Editar
                      </button>{' '}
                      <button type="button" className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => setDeleting(item)}>
                        <Trash2 size={12} />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? 'Editar noticia' : 'Nueva noticia'}
        description="Las noticias se publican en el apartado de noticias de la tienda."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={savingNews}>
              Cancelar
            </button>
            <button type="submit" form="news-form" className="btn-primary" disabled={savingNews}>
              {savingNews ? <Spinner size={14} /> : <Save size={15} />}
              {editing ? 'Guardar noticia' : 'Crear noticia'}
            </button>
          </>
        }
      >
        <form id="news-form" className="space-y-4" onSubmit={(event) => void handleNewsSubmit(event)}>
          <FormError message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="news-slug">Slug</label>
              <input
                id="news-slug"
                className="field font-mono text-xs"
                value={form.slug}
                maxLength={40}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="novedad-1"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="news-date">Fecha</label>
              <input
                id="news-date"
                type="date"
                className="field"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="news-title">Título</label>
            <input
              id="news-title"
              className="field"
              value={form.title}
              maxLength={120}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="news-excerpt">Resumen</label>
            <textarea
              id="news-excerpt"
              className="field min-h-[72px] resize-y"
              maxLength={300}
              value={form.excerpt}
              onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="news-image">Imagen</label>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div className="aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-[112px] items-center justify-center">
                    <ImageIcon size={20} className="text-white/30" />
                  </div>
                )}
              </div>
              <label className="field relative block overflow-hidden p-0">
                <span className="flex h-[112px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                  <ImageIcon size={20} className="text-white/30" />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => void handleNewsFile(event)}
                  aria-label="Subir imagen de la noticia"
                />
                <span className="absolute bottom-0 left-0 right-0 bg-black/55 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                  Subir imagen
                </span>
              </label>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="news-body">Cuerpo (párrafos separados por línea en blanco)</label>
            <textarea
              id="news-body"
              className="field min-h-[160px] resize-y"
              value={form.body.join('\n\n')}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  body: event.target.value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
                }))
              }
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar noticia"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
