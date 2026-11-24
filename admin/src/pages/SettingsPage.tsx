import {
  Building2,
  CreditCard,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  Music2,
  Percent,
  Save,
  ShieldCheck,
  StickyNote,
  Store,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { FormError, PageHeader, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { uploadAudio, uploadImage } from '../lib/upload'
import { formatDate } from '../lib/utils'
import type { PaymentSettings, PaymentSettingsInput } from '../types'

const EMPTY_FORM: PaymentSettingsInput = {
  companyName: '',
  logoUrl: '',
  musicUrl: '',
  studentDiscountPercent: 0,
  bankName: '',
  beneficiary: '',
  clabeNumber: '',
  mercadoPagoClabe: '',
  oxxoReference: '',
  whatsAppNumber: '',
  supportEmail: '',
  paymentNote: '',
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-white/40">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [form, setForm] = useState<PaymentSettingsInput>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.settings.get()
      setSettings(data)
      setForm({
        companyName: data.companyName,
        logoUrl: data.logoUrl,
        musicUrl: data.musicUrl,
        studentDiscountPercent: data.studentDiscountPercent,
        bankName: data.bankName,
        beneficiary: data.beneficiary,
        clabeNumber: data.clabeNumber,
        mercadoPagoClabe: data.mercadoPagoClabe,
        oxxoReference: data.oxxoReference,
        whatsAppNumber: data.whatsAppNumber,
        supportEmail: data.supportEmail,
        paymentNote: data.paymentNote,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const update = <K extends keyof PaymentSettingsInput>(key: K, value: PaymentSettingsInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleLogoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadImage(file, 'site')
      update('logoUrl', url)
      toast('Logo subido. Guarda la configuración para aplicarlo.')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No se pudo subir el logo.', 'error')
    } finally {
      event.target.value = ''
    }
  }

  const handleMusicFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadAudio(file)
      update('musicUrl', url)
      toast('Canción subida. Guarda la configuración para activarla en la tienda.')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No se pudo subir la canción.', 'error')
    } finally {
      event.target.value = ''
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!form.companyName.trim()) {
      setFormError('El nombre de la empresa es obligatorio.')
      return
    }
    if (
      !Number.isFinite(form.studentDiscountPercent) ||
      form.studentDiscountPercent < 0 ||
      form.studentDiscountPercent > 100
    ) {
      setFormError('El descuento de estudiante debe estar entre 0% y 100%.')
      return
    }

    type TextSettingKey = Exclude<keyof PaymentSettingsInput, 'studentDiscountPercent'>
    const required: Array<[TextSettingKey, string, number, number]> = [
      ['bankName', 'Banco', 2, 80],
      ['beneficiary', 'Beneficiario', 2, 160],
      ['clabeNumber', 'CLABE BBVA', 8, 30],
      ['mercadoPagoClabe', 'CLABE Mercado Pago', 8, 30],
      ['oxxoReference', 'Referencia OXXO', 3, 60],
      ['whatsAppNumber', 'WhatsApp', 8, 30],
      ['supportEmail', 'Email de soporte', 5, 160],
    ]
    for (const [key, label, min, max] of required) {
      const value = form[key].trim()
      if (value.length < min || value.length > max) {
        setFormError(`${label} debe tener entre ${min} y ${max} caracteres.`)
        return
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())) {
      setFormError('El email de soporte no es válido.')
      return
    }
    if (form.paymentNote.length > 1000) {
      setFormError('La nota de pago no puede superar 1000 caracteres.')
      return
    }

    setSaving(true)
    try {
      const updated = await api.settings.update({
        companyName: form.companyName.trim(),
        logoUrl: form.logoUrl.trim(),
        musicUrl: form.musicUrl.trim(),
        studentDiscountPercent: form.studentDiscountPercent,
        bankName: form.bankName.trim(),
        beneficiary: form.beneficiary.trim(),
        clabeNumber: form.clabeNumber.trim(),
        mercadoPagoClabe: form.mercadoPagoClabe.trim(),
        oxxoReference: form.oxxoReference.trim(),
        whatsAppNumber: form.whatsAppNumber.trim(),
        supportEmail: form.supportEmail.trim(),
        paymentNote: form.paymentNote.trim(),
      })
      setSettings(updated)
      toast('Configuración de pagos guardada')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Configuración"
        title="Pagos y contacto"
        description="Estos datos se muestran al cliente en el checkout y en el mensaje de WhatsApp."
        actions={
          <span className="badge border-white/[0.12] bg-white/[0.04] text-white/55">
            <Store size={12} />
            Tienda pública
          </span>
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
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-64" />
          ))}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormError message={formError} />

          <div className="grid gap-4 xl:grid-cols-2">
            <Section
              icon={<Store size={17} />}
              title="Marca y descuento estudiantil"
              description="Nombre, logo y porcentaje que la tienda aplica a los estudiantes aprobados."
            >
              <div>
                <label htmlFor="settings-company" className="field-label">
                  Nombre de la empresa
                </label>
                <input
                  id="settings-company"
                  className="field"
                  value={form.companyName}
                  onChange={(event) => update('companyName', event.target.value)}
                  placeholder="Eclipse Tech"
                  required
                  maxLength={80}
                />
              </div>
              <div>
                <span className="field-label">Logo de la empresa</span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="field relative block cursor-pointer overflow-hidden p-0 sm:w-40">
                    <span className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                      {form.logoUrl ? (
                        <img
                          src={form.logoUrl}
                          alt="Logo de la empresa"
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <ImageIcon size={24} className="text-white/30" />
                      )}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => void handleLogoFile(event)}
                      aria-label="Subir logo de la empresa"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/55 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                      Subir logo
                    </span>
                  </label>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="url"
                      className="field"
                      value={form.logoUrl}
                      onChange={(event) => update('logoUrl', event.target.value)}
                      placeholder="https://… o sube una imagen"
                    />
                    {form.logoUrl ? (
                      <button
                        type="button"
                        className="btn-secondary px-3 py-2 text-xs"
                        onClick={() => update('logoUrl', '')}
                      >
                        <Trash2 size={13} />
                        Quitar logo
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div>
                <span className="field-label">Música de la tienda (Eclipse +)</span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="field relative block cursor-pointer overflow-hidden p-0 sm:w-40">
                    <span className="flex h-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                      <Music2 size={24} className="text-white/30" />
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="sr-only"
                      onChange={(event) => void handleMusicFile(event)}
                      aria-label="Subir música de la tienda"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/55 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                      Subir canción
                    </span>
                  </label>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="url"
                      className="field"
                      value={form.musicUrl}
                      onChange={(event) => update('musicUrl', event.target.value)}
                      placeholder="https://… o pega un enlace de audio"
                    />
                    {form.musicUrl ? (
                      <div className="flex flex-col gap-2">
                        <audio controls preload="none" src={form.musicUrl} className="h-9 w-full" />
                        <button
                          type="button"
                          className="btn-secondary px-3 py-2 text-xs"
                          onClick={() => update('musicUrl', '')}
                        >
                          <Trash2 size={13} />
                          Quitar música
                        </button>
                      </div>
                    ) : null}
                    <p className="text-[11px] text-white/30">
                      Opcional. Se muestra en la tienda sin reproducción automática.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="settings-student-discount" className="field-label">
                  Descuento de estudiantes (%)
                </label>
                <div className="relative">
                  <Percent
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                  />
                  <input
                    id="settings-student-discount"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="field pl-10"
                    value={form.studentDiscountPercent}
                    onChange={(event) => update('studentDiscountPercent', Number(event.target.value))}
                    required
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-white/30">
                  Se aplica en la tienda a los perfiles verificados como estudiantes.
                </p>
              </div>
            </Section>

            <Section
              icon={<Building2 size={17} />}
              title="Transferencia BBVA"
              description="Datos bancarios que se muestran en la tarjeta de pago BBVA."
            >
              <div>
                <label htmlFor="settings-bank" className="field-label">
                  Banco
                </label>
                <input
                  id="settings-bank"
                  className="field"
                  value={form.bankName}
                  onChange={(event) => update('bankName', event.target.value)}
                  placeholder="BBVA México"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
              <div>
                <label htmlFor="settings-beneficiary" className="field-label">
                  Beneficiario
                </label>
                <input
                  id="settings-beneficiary"
                  className="field"
                  value={form.beneficiary}
                  onChange={(event) => update('beneficiary', event.target.value)}
                  placeholder="Eclipse Digital MX"
                  required
                  minLength={2}
                  maxLength={160}
                />
              </div>
              <div>
                <label htmlFor="settings-clabe" className="field-label">
                  CLABE interbancaria
                </label>
                <input
                  id="settings-clabe"
                  className="field font-mono text-xs tracking-wider"
                  value={form.clabeNumber}
                  onChange={(event) => update('clabeNumber', event.target.value.replace(/\s/g, ''))}
                  placeholder="012180015478965432"
                  required
                  minLength={8}
                  maxLength={30}
                />
              </div>
            </Section>

            <Section
              icon={<Wallet size={17} />}
              title="Mercado Pago y OXXO"
              description="CLABE de Mercado Pago y referencia de pago en tienda OXXO."
            >
              <div>
                <label htmlFor="settings-mp" className="field-label">
                  CLABE Mercado Pago
                </label>
                <input
                  id="settings-mp"
                  className="field font-mono text-xs tracking-wider"
                  value={form.mercadoPagoClabe}
                  onChange={(event) => update('mercadoPagoClabe', event.target.value.replace(/\s/g, ''))}
                  placeholder="722969010123456789"
                  required
                  minLength={8}
                  maxLength={30}
                />
              </div>
              <div>
                <label htmlFor="settings-oxxo" className="field-label">
                  Referencia OXXO
                </label>
                <input
                  id="settings-oxxo"
                  className="field font-mono text-xs tracking-wider"
                  value={form.oxxoReference}
                  onChange={(event) => update('oxxoReference', event.target.value)}
                  placeholder="ECLIPSE-4821"
                  required
                  minLength={3}
                  maxLength={60}
                />
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-[11px] leading-5 text-white/35">
                El cliente copia estos datos con un clic desde el carrito y confirma por WhatsApp con
                el número de orden.
              </div>
            </Section>

            <Section
              icon={<MessageCircle size={17} />}
              title="Contacto y WhatsApp"
              description="Número que recibe los comprobantes y email visible de soporte."
            >
              <div>
                <label htmlFor="settings-whatsapp" className="field-label">
                  Número de WhatsApp
                </label>
                <input
                  id="settings-whatsapp"
                  className="field font-mono text-xs tracking-wider"
                  value={form.whatsAppNumber}
                  onChange={(event) => update('whatsAppNumber', event.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="5215512345678"
                  required
                  minLength={8}
                  maxLength={30}
                />
                <p className="mt-1.5 text-[11px] text-white/30">
                  Incluye lada de país. Si son 10 dígitos, la tienda agrega 52 automáticamente.
                </p>
              </div>
              <div>
                <label htmlFor="settings-email" className="field-label">
                  Email de soporte
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    id="settings-email"
                    type="email"
                    className="field pl-10"
                    value={form.supportEmail}
                    onChange={(event) => update('supportEmail', event.target.value)}
                    placeholder="soporte@techyuc.com"
                    required
                    maxLength={160}
                  />
                </div>
              </div>
            </Section>

            <Section
              icon={<StickyNote size={17} />}
              title="Nota de pago"
              description="Instrucción breve que aparece debajo de los datos de pago."
            >
              <div>
                <label htmlFor="settings-note" className="field-label">
                  Mensaje para el cliente
                </label>
                <textarea
                  id="settings-note"
                  className="field min-h-[128px] resize-y"
                  value={form.paymentNote}
                  onChange={(event) => update('paymentNote', event.target.value)}
                  placeholder="Envía tu comprobante por WhatsApp para validar tu pago."
                  maxLength={1000}
                />
                <p className="mt-1.5 text-right text-[11px] text-white/25">
                  {form.paymentNote.length}/1000
                </p>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3 text-[11px] leading-5 text-emerald-100/60">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                <p>
                  Verifica los datos antes de guardar: se publican de inmediato en la tienda y los
                  clientes los usan para transferir.
                </p>
              </div>
            </Section>
          </div>

          <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-white/35">
              <CreditCard size={14} />
              Última actualización: {formatDate(settings?.updatedAt)}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void load()}
                disabled={saving}
              >
                Descartar cambios
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Spinner size={14} /> : <Save size={15} />}
                Guardar configuración
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
