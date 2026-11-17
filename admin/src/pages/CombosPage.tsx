import {
  Layers3,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { cn } from '../lib/utils'
import type { Combo, ComboInput } from '../types'

const EMPTY_FORM: ComboInput = {
  name: '',
  description: '',
  minProfiles: 2,
  discountPercent: 5,
  isActive: true,
}

function toForm(combo: Combo): ComboInput {
  return {
    name: combo.name,
    description: combo.description,
    minProfiles: combo.minProfiles,
    discountPercent: combo.discountPercent,
    isActive: combo.isActive,
  }
}

export function CombosPage() {
  const { toast } = useToast()
  const [combos, setCombos] = useState<Combo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Combo | null>(null)
  const [form, setForm] = useState<ComboInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Combo | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCombos(await api.combos.list())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar los combos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(
    () => [...combos].sort((a, b) => a.minProfiles - b.minProfiles),
    [combos],
  )

  const openCreate = () => {
    setCreating(true)
    setEditing(null)
    const nextProfiles = sorted.length > 0 ? Math.min(10, Math.max(...sorted.map((combo) => combo.minProfiles)) + 1) : 2
    setForm({ ...EMPTY_FORM, minProfiles: nextProfiles, name: `Combo ${nextProfiles} perfiles` })
    setFormError(null)
  }

  const openEdit = (combo: Combo) => {
    setCreating(false)
    setEditing(combo)
    setForm(toForm(combo))
    setFormError(null)
  }

  const closeModal = () => {
    if (saving) return
    setCreating(false)
    setEditing(null)
    setFormError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (form.name.trim().length < 3) {
      setFormError('El nombre debe tener al menos 3 caracteres.')
      return
    }
    if (form.minProfiles < 2 || form.minProfiles > 10) {
      setFormError('El mínimo de perfiles debe estar entre 2 y 10.')
      return
    }
    if (form.discountPercent < 1 || form.discountPercent > 90) {
      setFormError('El descuento debe estar entre 1% y 90%.')
      return
    }

    setSaving(true)
    try {
      const payload: ComboInput = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
      }
      if (editing) {
        const updated = await api.combos.update(editing.id, payload)
        setCombos((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        toast('Nivel de combo actualizado')
      } else {
        const created = await api.combos.create(payload)
        setCombos((current) => [...current, created])
        toast('Nivel de combo creado')
      }
      closeModal()
      setSaving(false)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos guardar el combo.')
      setSaving(false)
    }
  }

  const handleToggle = async (combo: Combo) => {
    setTogglingId(combo.id)
    try {
      const updated = await api.combos.toggle(combo.id)
      setCombos((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast(updated.isActive ? 'Nivel activado' : 'Nivel desactivado', updated.isActive ? 'success' : 'info')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos actualizar el combo.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.combos.remove(deleting.id)
      setCombos((current) => current.filter((item) => item.id !== deleting.id))
      toast('Nivel de combo eliminado')
      setDeleting(null)
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos eliminar el combo.', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Constructor de combos"
        title="Combos"
        description="Define los niveles de descuento progresivo que se aplican al combinar 2 o más perfiles."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Nuevo nivel
          </button>
        }
      />

      <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <TrendingDown size={17} />
          </span>
          <div>
            <p className="text-sm font-medium text-white/80">Descuento progresivo</p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Se aplica el nivel más alto que cumpla el número de perfiles del combo. Por ejemplo, con
              los valores por defecto: 2 perfiles = 5%, 3 perfiles = 10% y 4 o más = 15%.
            </p>
          </div>
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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-52" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Layers3}
            title="Sin niveles de combo"
            description="Crea el primer nivel para habilitar descuentos al combinar perfiles."
            action={
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus size={16} />
                Nuevo nivel
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((combo, index) => (
            <article
              key={combo.id}
              className={cn(
                'panel flex flex-col p-5 transition',
                combo.isActive ? 'hover:border-primary/30' : 'opacity-70',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 font-display text-sm font-bold text-primary">
                    {combo.minProfiles}+
                  </span>
                  <div>
                    <h3 className="font-display text-base font-semibold text-white">{combo.name}</h3>
                    <p className="text-[11px] text-white/35">Nivel {index + 1}</p>
                  </div>
                </div>
                {combo.isActive ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}
              </div>

              <p className="mt-4 min-h-[40px] flex-1 text-xs leading-5 text-white/45">
                {combo.description || 'Sin descripción adicional.'}
              </p>

              <div className="mt-4 flex items-end justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                    <Users size={11} />
                    Perfiles
                  </p>
                  <p className="mt-0.5 font-display text-lg font-semibold text-white">{combo.minProfiles}+</p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                    <Sparkles size={11} />
                    Descuento
                  </p>
                  <p className="mt-0.5 font-display text-lg font-semibold text-emerald-300">
                    -{combo.discountPercent}%
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={combo.isActive}
                    onChange={() => void handleToggle(combo)}
                    disabled={togglingId === combo.id}
                    label={`Activar ${combo.name}`}
                  />
                  {togglingId === combo.id ? <Spinner size={13} /> : null}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openEdit(combo)}
                    aria-label={`Editar ${combo.name}`}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                    onClick={() => setDeleting(combo)}
                    aria-label={`Eliminar ${combo.name}`}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? 'Editar nivel de combo' : 'Nuevo nivel de combo'}
        description="Cada cantidad de perfiles solo puede tener un nivel activo."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="combo-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : <Layers3 size={15} />}
              {editing ? 'Guardar cambios' : 'Crear nivel'}
            </button>
          </>
        }
      >
        <form id="combo-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormError message={formError} />

          <div>
            <label htmlFor="combo-name" className="field-label">
              Nombre
            </label>
            <input
              id="combo-name"
              className="field"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Combo 3 perfiles"
              required
              minLength={3}
              maxLength={120}
            />
          </div>

          <div>
            <label htmlFor="combo-description" className="field-label">
              Descripción
            </label>
            <textarea
              id="combo-description"
              className="field min-h-[84px] resize-y"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Ahorra más al combinar tus plataformas favoritas."
              maxLength={400}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="combo-profiles" className="field-label">
                Mínimo de perfiles
              </label>
              <input
                id="combo-profiles"
                type="number"
                min={2}
                max={10}
                className="field"
                value={form.minProfiles}
                onChange={(event) =>
                  setForm((current) => ({ ...current, minProfiles: Number(event.target.value) }))
                }
                required
              />
            </div>
            <div>
              <label htmlFor="combo-discount" className="field-label">
                Descuento (%)
              </label>
              <input
                id="combo-discount"
                type="number"
                min={1}
                max={90}
                className="field"
                value={form.discountPercent}
                onChange={(event) =>
                  setForm((current) => ({ ...current, discountPercent: Number(event.target.value) }))
                }
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div>
              <p className="text-sm font-medium text-white/80">Nivel activo</p>
              <p className="mt-0.5 text-[11px] text-white/35">
                Los niveles inactivos no se aplican al construir combos.
              </p>
            </div>
            <Toggle
              checked={form.isActive}
              onChange={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
              label="Nivel activo"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar nivel de combo"
        description={`¿Seguro que quieres eliminar “${deleting?.name ?? ''}”? Los combos ya agregados al carrito no se recalcularán retroactivamente.`}
        confirmLabel="Eliminar"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
