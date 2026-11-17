import {
  Baby,
  Briefcase,
  Check,
  ChevronRight,
  Code2,
  Crown,
  Eye,
  Flower2,
  Ghost,
  Leaf,
  Palette,
  Rocket,
  Save,
  Snowflake,
  Sparkles,
  Type,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { Badge, FormError, PageHeader, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { PRESET_ORDER, THEME_PRESET_BY_KEY } from '../lib/themePresets'
import { cn, formatDate, hexToRgb } from '../lib/utils'
import { SEASON_LABELS, type Theme, type ThemeInput } from '../types'

const FONTS = [
  'Sora',
  'Outfit',
  'Space Grotesk',
  'Fraunces',
  'Special Elite',
  'Mountains of Christmas',
  'Cinzel',
  'Playfair Display',
  'Fredoka',
  'Oswald',
]

const THEME_ICONS: Record<string, LucideIcon> = {
  base: Palette,
  autumn: Leaf,
  halloween: Ghost,
  christmas: Snowflake,
  reyes: Crown,
  mothers: Flower2,
  children: Rocket,
  fathers: Briefcase,
  baby: Baby,
}

function toDraft(theme: Theme): ThemeInput {
  return {
    themeKey: theme.themeKey,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    fontStyle: theme.fontStyle,
    customCss: theme.customCss,
  }
}

function previewStyle(theme: ThemeInput) {
  return {
    '--primary-rgb': hexToRgb(theme.primaryColor),
    '--secondary-rgb': hexToRgb(theme.secondaryColor),
    '--accent-rgb': hexToRgb(theme.accentColor),
    '--bg-rgb': hexToRgb(theme.backgroundColor),
    '--font-app': `'${theme.fontStyle || 'Sora'}'`,
    '--font-display': `'${theme.fontStyle || 'Sora'}'`,
  } as CSSProperties
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#8b5cf6'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-8 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          aria-label={`Selector de color ${label}`}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase text-white/75 outline-none"
          maxLength={7}
          aria-label={`Código hexadecimal ${label}`}
        />
      </div>
    </div>
  )
}

export function ThemePage() {
  const { toast } = useToast()
  const [themes, setThemes] = useState<Theme[]>([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<ThemeInput | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const applyResponse = useCallback(
    (response: { themes: Theme[]; active: Theme | null }, selectKey?: string) => {
      const sorted = [...response.themes].sort(
        (a, b) =>
          (PRESET_ORDER.indexOf(a.themeKey) === -1 ? 99 : PRESET_ORDER.indexOf(a.themeKey)) -
          (PRESET_ORDER.indexOf(b.themeKey) === -1 ? 99 : PRESET_ORDER.indexOf(b.themeKey)),
      )
      setThemes(sorted)
      setActiveKey(response.active?.themeKey ?? null)
      const key = selectKey ?? response.active?.themeKey ?? sorted[0]?.themeKey ?? null
      setSelectedKey(key)
      const selected = sorted.find((theme) => theme.themeKey === key) ?? response.active ?? sorted[0]
      setDraft(selected ? toDraft(selected) : null)
    },
    [],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      applyResponse(await api.theme.get())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar los temas.')
    } finally {
      setLoading(false)
    }
  }, [applyResponse])

  useEffect(() => {
    void load()
  }, [load])

  const orderedThemes = useMemo(() => {
    return [...themes].sort((a, b) => {
      const indexA = PRESET_ORDER.indexOf(a.themeKey)
      const indexB = PRESET_ORDER.indexOf(b.themeKey)
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
    })
  }, [themes])

  const selectTheme = (theme: Theme) => {
    setSelectedKey(theme.themeKey)
    setDraft(toDraft(theme))
    setFormError(null)
  }

  const updateDraft = <K extends keyof ThemeInput>(key: K, value: ThemeInput[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  const handleActivate = async (theme: Theme) => {
    setActivating(theme.themeKey)
    setFormError(null)
    try {
      const active = await api.theme.activate(theme.themeKey)
      setThemes((current) =>
        current.map((item) => ({ ...item, isActive: item.themeKey === active.themeKey })),
      )
      setActiveKey(active.themeKey)
      setSelectedKey(active.themeKey)
      setDraft(toDraft(active))
      toast(`Tema “${SEASON_LABELS[active.themeKey] ?? active.themeKey}” activado`)
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos activar el tema.', 'error')
    } finally {
      setActivating(null)
    }
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft) return
    setFormError(null)

    if (draft.themeKey.trim().length < 2) {
      setFormError('La clave del tema debe tener al menos 2 caracteres.')
      return
    }
    for (const [label, value] of [
      ['primario', draft.primaryColor],
      ['secundario', draft.secondaryColor],
      ['acento', draft.accentColor],
      ['fondo', draft.backgroundColor],
    ] as const) {
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
        setFormError(`El color ${label} debe ser hexadecimal, por ejemplo #8B5CF6.`)
        return
      }
    }

    setSaving(true)
    try {
      const saved = await api.theme.save({
        ...draft,
        themeKey: draft.themeKey.trim().toLowerCase(),
        customCss: draft.customCss.trim(),
      })
      setThemes((current) =>
        current.map((item) => ({ ...item, isActive: item.themeKey === saved.themeKey })),
      )
      setActiveKey(saved.themeKey)
      setSelectedKey(saved.themeKey)
      setDraft(toDraft(saved))
      toast('Tema guardado y activado')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'No pudimos guardar el tema.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Apariencia"
        title="Motor de temas"
        description="Aplica un preset de temporada con un clic o ajusta cada color. El tema activo se aplica a toda la tienda."
        actions={
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            {loading ? <Spinner size={14} /> : <Wand2 size={15} />}
            Recargar
          </button>
        }
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Palette size={16} className="text-primary" />
            <h2 className="font-display text-lg font-semibold text-white">Presets de temporada</h2>
          </div>
          <p className="mb-5 text-xs leading-5 text-white/40">
            Un clic activa el preset para todos los visitantes. Puedes editar los colores después y
            guardarlos como una nueva versión del tema.
          </p>

          {loading && themes.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="skeleton h-48" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {orderedThemes.map((theme) => {
                const isActive = theme.themeKey === activeKey
                const isSelected = theme.themeKey === selectedKey
                return (
                  <div
                    key={theme.themeKey}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border p-4 transition',
                      isSelected
                        ? 'border-white/30 bg-white/[0.06] shadow-[0_18px_50px_-24px_rgba(139,92,246,.7)]'
                        : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20',
                    )}
                    style={{
                      backgroundImage: `radial-gradient(22rem 12rem at 100% 0%, ${theme.primaryColor}33, transparent 70%)`,
                    }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-2 -top-3 text-5xl opacity-20 transition group-hover:scale-110 group-hover:opacity-35"
                    >
                      {THEME_PRESET_BY_KEY[theme.themeKey]?.emoji ?? '✨'}
                    </span>

                    <div className="relative mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/20 text-white shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                          }}
                        >
                          {(() => {
                            const Icon = THEME_ICONS[theme.themeKey] ?? Sparkles
                            return <Icon size={18} className="drop-shadow" />
                          })()}
                        </span>
                        <div>
                          <p className="font-display text-sm font-semibold text-white">
                            {SEASON_LABELS[theme.themeKey] ?? theme.themeKey}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-white/30">{theme.themeKey}</p>
                        </div>
                      </div>
                      {isActive ? (
                        <Badge tone="success">
                          <Check size={10} />
                          Activo
                        </Badge>
                      ) : null}
                    </div>

                    <p className="relative mb-3 line-clamp-2 min-h-8 text-[11px] leading-4 text-white/45">
                      {THEME_PRESET_BY_KEY[theme.themeKey]?.description ??
                        'Tema personalizado del panel.'}
                    </p>

                    <div
                      className="relative mb-4 h-16 overflow-hidden rounded-xl border border-white/10 p-2.5"
                      style={{ backgroundColor: theme.backgroundColor }}
                    >
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex gap-1.5">
                          {[theme.primaryColor, theme.secondaryColor, theme.accentColor].map((color) => (
                            <span
                              key={color}
                              className="h-3 w-8 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div
                          className="h-1.5 w-2/3 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                          }}
                        />
                        <div className="h-1 w-1/2 rounded-full bg-white/25" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-secondary flex-1 px-3 py-2 text-xs"
                        onClick={() => selectTheme(theme)}
                      >
                        Editar
                        <ChevronRight size={13} />
                      </button>
                      {!isActive ? (
                        <button
                          type="button"
                          className="btn-primary flex-1 px-3 py-2 text-xs"
                          onClick={() => void handleActivate(theme)}
                          disabled={activating !== null}
                        >
                          {activating === theme.themeKey ? <Spinner size={13} /> : <Sparkles size={13} />}
                          Aplicar
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-secondary" />
              <h2 className="font-display text-lg font-semibold text-white">Vista previa</h2>
            </div>
            {draft ? (
              <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                {SEASON_LABELS[draft.themeKey] ?? draft.themeKey}
              </span>
            ) : null}
          </div>

          {draft ? (
            <div
              className="relative overflow-hidden rounded-2xl border border-white/10"
              style={{ ...previewStyle(draft), backgroundColor: `rgb(${hexToRgb(draft.backgroundColor)})` }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute right-3 top-14 text-5xl opacity-25 drop-shadow-[0_0_18px_rgba(255,255,255,.35)]"
              >
                {THEME_PRESET_BY_KEY[draft.themeKey]?.emoji ?? '✨'}
              </span>
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="font-display text-[11px] font-bold tracking-[0.22em] text-white">ECLIPSE</span>
                <div className="flex gap-1.5">
                  <span
                    className="rounded-full px-2.5 py-1 text-[9px] font-semibold text-white"
                    style={{ backgroundColor: draft.primaryColor }}
                  >
                    Ofertas
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[9px] font-semibold"
                    style={{ backgroundColor: draft.accentColor, color: '#111' }}
                  >
                    +18
                  </span>
                </div>
              </div>
              <div
                className="space-y-3 p-4"
                style={{
                  background: `radial-gradient(18rem 10rem at 85% 0%, rgb(${hexToRgb(draft.primaryColor)} / .35), transparent 70%)`,
                }}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/50">
                  Temporada activa
                </p>
                <p
                  className="font-display text-lg font-semibold leading-tight"
                  style={{
                    background: `linear-gradient(100deg, #fff 10%, ${draft.secondaryColor} 55%, ${draft.primaryColor} 100%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Tus licencias favoritas, con hasta 35% off.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map((index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5"
                    >
                      <div
                        className="mb-2 h-9 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${draft.primaryColor}55, ${draft.secondaryColor}44)`,
                        }}
                      />
                      <div className="h-1.5 w-3/4 rounded-full bg-white/40" />
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="h-1 w-1/3 rounded-full bg-white/20" />
                        <span
                          className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white"
                          style={{ backgroundColor: draft.primaryColor }}
                        >
                          Comprar
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="text-[9px] text-white/60">Pago seguro · Entrega inmediata</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[8px] font-semibold"
                    style={{ backgroundColor: draft.accentColor, color: '#111' }}
                  >
                    WhatsApp
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="skeleton h-64" />
          )}

          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 text-[11px] text-white/35">
            <span>Última actualización</span>
            <span>{formatDate(themes.find((theme) => theme.themeKey === selectedKey)?.updatedAt)}</span>
          </div>
        </section>
      </div>

      <form className="panel mt-5 p-5" onSubmit={handleSave}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h2 className="font-display text-lg font-semibold text-white">Editor de tema</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const theme = themes.find((item) => item.themeKey === selectedKey)
                if (theme) selectTheme(theme)
              }}
              disabled={saving || !draft}
            >
              Descartar cambios
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !draft}>
              {saving ? <Spinner size={14} /> : <Save size={15} />}
              Guardar y activar
            </button>
          </div>
        </div>

        {draft ? (
          <>
            <FormError message={formError} />
            <div className={cn('mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]', formError && 'mt-4')}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="theme-key" className="field-label">
                    Clave del tema
                  </label>
                  <input
                    id="theme-key"
                    className="field font-mono text-xs"
                    value={draft.themeKey}
                    onChange={(event) => updateDraft('themeKey', event.target.value.toLowerCase())}
                    maxLength={32}
                    required
                  />
                  <p className="mt-1.5 text-[11px] text-white/30">
                    Claves recomendadas: base, autumn, halloween, christmas, reyes.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ColorField
                    label="Primario"
                    value={draft.primaryColor}
                    onChange={(value) => updateDraft('primaryColor', value)}
                  />
                  <ColorField
                    label="Secundario"
                    value={draft.secondaryColor}
                    onChange={(value) => updateDraft('secondaryColor', value)}
                  />
                  <ColorField
                    label="Acento"
                    value={draft.accentColor}
                    onChange={(value) => updateDraft('accentColor', value)}
                  />
                  <ColorField
                    label="Fondo"
                    value={draft.backgroundColor}
                    onChange={(value) => updateDraft('backgroundColor', value)}
                  />
                </div>

                <div>
                  <label htmlFor="theme-font" className="field-label">
                    Tipografía
                  </label>
                  <div className="relative">
                    <Type size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <select
                      id="theme-font"
                      className="field appearance-none pl-10"
                      value={draft.fontStyle}
                      onChange={(event) => updateDraft('fontStyle', event.target.value)}
                    >
                      {Array.from(new Set([...FONTS, draft.fontStyle])).map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="theme-css" className="field-label">
                  CSS personalizado (opcional)
                </label>
                <div className="relative">
                  <Code2 size={15} className="pointer-events-none absolute left-3.5 top-3.5 text-white/30" />
                  <textarea
                    id="theme-css"
                    className="field min-h-[206px] resize-y pl-10 font-mono text-xs leading-6"
                    value={draft.customCss}
                    onChange={(event) => updateDraft('customCss', event.target.value)}
                    placeholder={'.hero-title { letter-spacing: -0.04em; }'}
                    maxLength={20000}
                    spellCheck={false}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-white/30">
                  Se inyecta en un tag &lt;style&gt; dentro de la tienda. Úsalo para ajustes finos de
                  temporada.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="skeleton h-48" />
        )}
      </form>
    </div>
  )
}
