import {
  Boxes,
  Filter,
  ImageIcon,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  FormError,
  Modal,
  PageHeader,
  SkeletonRows,
  Spinner,
  Toggle,
} from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { useDebounce } from '../lib/hooks'
import { cn, formatCurrency } from '../lib/utils'
import { uploadImage } from '../lib/upload'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type Product,
  type ProductInput,
} from '../types'

const EMPTY_FORM: ProductInput = {
  name: '',
  category: 'Video',
  basePrice: 199,
  discountPercent: 0,
  durationMonths: 1,
  imageUrl: '',
  isActive: true,
  isAdultOnly: false,
  isFeatured: false,
}

function toForm(product: Product): ProductInput {
  return {
    name: product.name,
    category: product.category,
    basePrice: product.basePrice,
    discountPercent: product.discountPercent,
    durationMonths: product.durationMonths,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    isAdultOnly: product.isAdultOnly,
    isFeatured: product.isFeatured,
  }
}

export function ProductsPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const debouncedSearch = useDebounce(search, 350)

  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const modalOpen = creating || editing !== null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProducts(
        await api.products.list({
          search: debouncedSearch.trim() || undefined,
          category: category || undefined,
        }),
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar el catálogo.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category])

  useEffect(() => {
    void load()
  }, [load])

  const totals = useMemo(
    () => ({
      all: products.length,
      active: products.filter((product) => product.isActive).length,
      featured: products.filter((product) => product.isFeatured).length,
      adult: products.filter((product) => product.isAdultOnly).length,
    }),
    [products],
  )

  const openCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const openEdit = (product: Product) => {
    setCreating(false)
    setEditing(product)
    setForm(toForm(product))
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
      const url = await uploadImage(file, 'products')
      setForm((current) => ({ ...current, imageUrl: url }))
      toast('Imagen subida correctamente')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos subir la imagen.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const updateForm = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'category' && value === 'AdultPlus' ? { isAdultOnly: true } : {}),
      ...(key === 'category' && value !== 'AdultPlus' ? { isAdultOnly: false } : {}),
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (form.name.trim().length < 3) {
      setFormError('El nombre debe tener al menos 3 caracteres.')
      return
    }
    if (!Number.isFinite(form.basePrice) || form.basePrice <= 0) {
      setFormError('El precio base debe ser mayor a 0.')
      return
    }
    if (form.imageUrl.trim() && !/^https?:\/\//i.test(form.imageUrl.trim())) {
      setFormError('La imagen debe ser una URL http(s) válida.')
      return
    }

    setSaving(true)
    try {
      const payload: ProductInput = {
        ...form,
        name: form.name.trim(),
        imageUrl: form.imageUrl.trim(),
        isAdultOnly: form.category === 'AdultPlus' ? true : form.isAdultOnly,
      }
      if (editing) {
        await api.products.update(editing.id, payload)
        toast('Producto actualizado correctamente')
      } else {
        await api.products.create(payload)
        toast('Producto creado correctamente')
      }
      closeModal()
      setSaving(false)
      await load()
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos guardar el producto.')
      setSaving(false)
    }
  }

  const handleToggle = async (product: Product) => {
    setTogglingId(product.id)
    try {
      const updated = await api.products.toggle(product.id)
      setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast(updated.isActive ? 'Producto activado' : 'Producto desactivado', updated.isActive ? 'success' : 'info')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos actualizar el producto.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.products.remove(deleting.id)
      setProducts((current) => current.filter((item) => item.id !== deleting.id))
      toast('Producto eliminado')
      setDeleting(null)
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos eliminar el producto.', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Crea, edita y activa licencias. Los cambios se reflejan de inmediato en la tienda pública."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Nuevo producto
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'En vista', value: totals.all, tone: 'text-white' },
          { label: 'Activos', value: totals.active, tone: 'text-emerald-300' },
          { label: 'Destacados', value: totals.featured, tone: 'text-accent' },
          { label: '+18', value: totals.adult, tone: 'text-rose-300' },
        ].map((item) => (
          <div key={item.label} className="panel flex items-center justify-between px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {item.label}
            </span>
            <span className={cn('font-display text-xl font-semibold', item.tone)}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="panel mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field pl-10"
            placeholder="Buscar por nombre…"
            aria-label="Buscar productos"
          />
        </div>
        <div className="relative sm:w-60">
          <Filter size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as Category | '')}
            className="field appearance-none pl-10"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
          <button type="button" className="btn-secondary mt-3" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        {loading ? (
          <SkeletonRows rows={7} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Sin productos en esta vista"
            description="Ajusta los filtros o crea tu primer producto para comenzar a vender."
            action={
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus size={16} />
                Nuevo producto
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="table-head">Producto</th>
                  <th className="table-head">Categoría</th>
                  <th className="table-head">Precio</th>
                  <th className="table-head">Desc.</th>
                  <th className="table-head">Base</th>
                  <th className="table-head">Etiquetas</th>
                  <th className="table-head">Activo</th>
                  <th className="table-head text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {products.map((product) => (
                  <tr key={product.id} className="transition hover:bg-white/[0.025]">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt=""
                              className="h-full w-full object-contain p-1"
                              loading="lazy"
                            />
                          ) : (
                            <Package size={16} className="text-white/35" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-medium text-white/90">{product.name}</p>
                          <p className="text-[11px] text-white/30">ID #{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge tone={product.isAdultOnly ? 'danger' : 'neutral'}>
                        {CATEGORY_LABELS[product.category]}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-white">{formatCurrency(product.finalPrice)}</p>
                      {product.discountPercent > 0 ? (
                        <p className="text-[11px] text-white/30 line-through">{formatCurrency(product.basePrice)}</p>
                      ) : null}
                    </td>
                    <td className="table-cell">
                      {product.discountPercent > 0 ? (
                        <Badge tone="success">-{product.discountPercent}%</Badge>
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </td>
                    <td className="table-cell text-white/55">{product.durationMonths} mes(es)</td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {product.isFeatured ? (
                          <Badge tone="warning">
                            <Star size={10} />
                            Destacado
                          </Badge>
                        ) : null}
                        {product.isAdultOnly ? <Badge tone="danger">+18</Badge> : null}
                        {!product.isFeatured && !product.isAdultOnly ? (
                          <span className="text-xs text-white/25">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={product.isActive}
                          onChange={() => void handleToggle(product)}
                          disabled={togglingId === product.id}
                          label={`Activar ${product.name}`}
                        />
                        {togglingId === product.id ? <Spinner size={13} /> : null}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.name}`}
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                          onClick={() => setDeleting(product)}
                          aria-label={`Eliminar ${product.name}`}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        description="Los precios base se multiplican por la duración elegida en la tienda."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="product-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : <Sparkles size={15} />}
              {editing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </>
        }
      >
        <form id="product-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormError message={formError} />

          <div>
            <label htmlFor="product-name" className="field-label">
              Nombre
            </label>
            <input
              id="product-name"
              className="field"
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              placeholder="Ej. Netflix Premium 4K"
              required
              minLength={3}
              maxLength={160}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="product-category" className="field-label">
                Categoría
              </label>
              <select
                id="product-category"
                className="field"
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value as Category)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="product-duration" className="field-label">
                Duración base
              </label>
              <select
                id="product-duration"
                className="field"
                value={form.durationMonths}
                onChange={(event) => updateForm('durationMonths', Number(event.target.value))}
              >
                {[1, 3, 6, 12].map((months) => (
                  <option key={months} value={months}>
                    {months} mes(es)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="product-price" className="field-label">
                Precio base (MXN)
              </label>
              <input
                id="product-price"
                type="number"
                min={1}
                max={100000}
                step="0.01"
                className="field"
                value={form.basePrice}
                onChange={(event) => updateForm('basePrice', Number(event.target.value))}
                required
              />
            </div>
            <div>
              <label htmlFor="product-discount" className="field-label">
                Descuento (%)
              </label>
              <input
                id="product-discount"
                type="number"
                min={0}
                max={90}
                className="field"
                value={form.discountPercent}
                onChange={(event) => updateForm('discountPercent', Number(event.target.value))}
              />
            </div>
          </div>

          <div>
            <label htmlFor="product-image" className="field-label">
              Imagen del producto (subir o URL)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <ImageIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id="product-image"
                  className="field pl-10"
                  value={form.imageUrl}
                  onChange={(event) => updateForm('imageUrl', event.target.value)}
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
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <img src={form.imageUrl} alt="Vista previa del producto" className="h-16 w-16 rounded-lg bg-white/5 object-contain p-1" />
                <p className="text-[11px] text-white/45 break-all">{form.imageUrl}</p>
              </div>
            ) : null}
            <p className="mt-1.5 text-[11px] text-white/35">
              Puedes subir la imagen desde tu equipo (Firebase Storage) o pegar una URL.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            {[
              {
                key: 'isActive' as const,
                label: 'Visible en la tienda',
                hint: 'Los productos inactivos no se muestran al público.',
              },
              {
                key: 'isFeatured' as const,
                label: 'Destacado en carrusel',
                hint: 'Aparece en la sección de productos destacados.',
              },
              {
                key: 'isAdultOnly' as const,
                label: 'Contenido +18',
                hint: 'Requiere verificación de edad. Solo para categoría AdultPlus.',
              },
            ].map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white/80">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-white/35">{item.hint}</p>
                </div>
                <Toggle
                  checked={form[item.key]}
                  onChange={() => updateForm(item.key, !form[item.key])}
                  disabled={item.key === 'isAdultOnly' && form.category !== 'AdultPlus'}
                  label={item.label}
                />
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar producto"
        description={`¿Seguro que quieres eliminar “${deleting?.name ?? ''}”? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
