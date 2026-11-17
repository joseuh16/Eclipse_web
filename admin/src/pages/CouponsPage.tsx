import {
  CalendarClock,
  Check,
  Copy,
  Pencil,
  Plus,
  Search,
  TicketPercent,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { formatShortDate, fromDateInput, toDateInput } from '../lib/utils'
import type { Coupon, CouponInput } from '../types'

const EMPTY_FORM: CouponInput = {
  code: '',
  discountPercent: 10,
  maxUses: 100,
  expiryDate: null,
  isActive: true,
}

function toForm(coupon: Coupon): CouponInput {
  return {
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    maxUses: coupon.maxUses,
    expiryDate: coupon.expiryDate,
    isActive: coupon.isActive,
  }
}

export function CouponsPage() {
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CouponInput>(EMPTY_FORM)
  const [expiry, setExpiry] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Coupon | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCoupons(await api.coupons.list())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar los cupones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toUpperCase()
    return term ? coupons.filter((coupon) => coupon.code.includes(term)) : coupons
  }, [coupons, search])

  const openCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm(EMPTY_FORM)
    setExpiry('')
    setFormError(null)
  }

  const openEdit = (coupon: Coupon) => {
    setCreating(false)
    setEditing(coupon)
    setForm(toForm(coupon))
    setExpiry(toDateInput(coupon.expiryDate))
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
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(form.code.trim())) {
      setFormError('El código debe tener entre 3 y 40 caracteres: letras, números, guiones o guiones bajos.')
      return
    }
    if (form.discountPercent < 1 || form.discountPercent > 90) {
      setFormError('El descuento debe estar entre 1% y 90%.')
      return
    }

    setSaving(true)
    try {
      const payload: CouponInput = {
        ...form,
        code: form.code.trim().toUpperCase(),
        expiryDate: fromDateInput(expiry),
      }
      if (editing) {
        const updated = await api.coupons.update(editing.id, payload)
        setCoupons((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        toast('Cupón actualizado')
      } else {
        const created = await api.coupons.create(payload)
        setCoupons((current) => [created, ...current])
        toast('Cupón creado')
      }
      closeModal()
      setSaving(false)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos guardar el cupón.')
      setSaving(false)
    }
  }

  const handleToggle = async (coupon: Coupon) => {
    setTogglingId(coupon.id)
    try {
      const updated = await api.coupons.toggle(coupon.id)
      setCoupons((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast(updated.isActive ? 'Cupón activado' : 'Cupón desactivado', updated.isActive ? 'success' : 'info')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos actualizar el cupón.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.coupons.remove(deleting.id)
      setCoupons((current) => current.filter((item) => item.id !== deleting.id))
      toast('Cupón eliminado')
      setDeleting(null)
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos eliminar el cupón.', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      toast('No se pudo copiar el código', 'error')
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Promociones"
        title="Cupones"
        description="Crea descuentos por porcentaje con límite de usos y fecha de expiración."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Nuevo cupón
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Cupones', value: coupons.length, tone: 'text-white' },
          { label: 'Activos', value: coupons.filter((coupon) => coupon.isActive && !coupon.isExpired).length, tone: 'text-emerald-300' },
          { label: 'Canjes', value: coupons.reduce((sum, coupon) => sum + coupon.usedCount, 0), tone: 'text-accent' },
        ].map((item) => (
          <div key={item.label} className="panel flex items-center justify-between px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {item.label}
            </span>
            <span className={`font-display text-xl font-semibold ${item.tone}`}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="panel mb-5 p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field pl-10"
            placeholder="Buscar cupón por código…"
            aria-label="Buscar cupones"
          />
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
          <SkeletonRows rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={TicketPercent}
            title="Sin cupones"
            description="Crea un código de descuento para tus campañas de temporada."
            action={
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus size={16} />
                Nuevo cupón
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="table-head">Código</th>
                  <th className="table-head">Descuento</th>
                  <th className="table-head">Usos</th>
                  <th className="table-head">Expira</th>
                  <th className="table-head">Estado</th>
                  <th className="table-head">Activo</th>
                  <th className="table-head text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((coupon) => {
                  const percent = coupon.maxUses > 0 ? Math.min(100, (coupon.usedCount / coupon.maxUses) * 100) : 0
                  return (
                    <tr key={coupon.id} className="transition hover:bg-white/[0.025]">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            className="icon-btn h-7 w-7"
                            onClick={() => void copyCode(coupon.code)}
                            aria-label={`Copiar ${coupon.code}`}
                            title="Copiar código"
                          >
                            {copied === coupon.code ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td className="table-cell">
                        <Badge tone="success">-{coupon.discountPercent}%</Badge>
                      </td>
                      <td className="table-cell">
                        <div className="w-32">
                          <div className="mb-1 flex justify-between text-[11px]">
                            <span className="text-white/60">{coupon.usedCount}</span>
                            <span className="text-white/30">{coupon.maxUses}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                            <div
                              className={`h-full rounded-full ${
                                percent >= 100 ? 'bg-rose-400' : 'bg-primary'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-white/25">{coupon.remainingUses} restantes</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1.5 text-xs text-white/50">
                          <CalendarClock size={13} />
                          {coupon.expiryDate ? formatShortDate(coupon.expiryDate) : 'Sin límite'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {coupon.isExpired ? (
                          <Badge tone="danger">Expirado</Badge>
                        ) : coupon.remainingUses <= 0 ? (
                          <Badge tone="warning">Agotado</Badge>
                        ) : coupon.isActive ? (
                          <Badge tone="success">Vigente</Badge>
                        ) : (
                          <Badge>Inactivo</Badge>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Toggle
                            checked={coupon.isActive}
                            onChange={() => void handleToggle(coupon)}
                            disabled={togglingId === coupon.id}
                            label={`Activar cupón ${coupon.code}`}
                          />
                          {togglingId === coupon.id ? <Spinner size={13} /> : null}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(coupon)}
                            aria-label={`Editar ${coupon.code}`}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                            onClick={() => setDeleting(coupon)}
                            aria-label={`Eliminar ${coupon.code}`}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? 'Editar cupón' : 'Nuevo cupón'}
        description="Define un porcentaje de descuento entre 1% y 90% y controla cuántas veces puede canjearse."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="coupon-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : <TicketPercent size={15} />}
              {editing ? 'Guardar cambios' : 'Crear cupón'}
            </button>
          </>
        }
      >
        <form id="coupon-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormError message={formError} />

          <div>
            <label htmlFor="coupon-code" className="field-label">
              Código
            </label>
            <input
              id="coupon-code"
              className="field font-mono uppercase tracking-wider"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              placeholder="ECLIPSE10"
              required
              minLength={3}
              maxLength={40}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="coupon-discount" className="field-label">
                Descuento (%)
              </label>
              <input
                id="coupon-discount"
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
            <div>
              <label htmlFor="coupon-uses" className="field-label">
                Usos máximos
              </label>
              <input
                id="coupon-uses"
                type="number"
                min={1}
                max={100000}
                className="field"
                value={form.maxUses}
                onChange={(event) =>
                  setForm((current) => ({ ...current, maxUses: Number(event.target.value) }))
                }
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="coupon-expiry" className="field-label">
              Fecha de expiración (opcional)
            </label>
            <input
              id="coupon-expiry"
              type="date"
              className="field"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-white/30">
              Se considera vigente hasta el final del día seleccionado.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div>
              <p className="text-sm font-medium text-white/80">Cupón activo</p>
              <p className="mt-0.5 text-[11px] text-white/35">
                Desactívalo para pausar la promoción sin eliminarla.
              </p>
            </div>
            <Toggle
              checked={form.isActive}
              onChange={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
              label="Cupón activo"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar cupón"
        description={`¿Seguro que quieres eliminar el cupón “${deleting?.code ?? ''}”? Las órdenes ya registradas no se verán afectadas.`}
        confirmLabel="Eliminar"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
