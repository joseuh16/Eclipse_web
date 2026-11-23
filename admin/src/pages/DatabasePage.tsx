import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Database,
  FileJson,
  Gauge,
  KeyRound,
  MessageSquareText,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  FormError,
  Modal,
  PageHeader,
  SkeletonRows,
  Spinner,
} from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useBrand } from '../hooks/useBrand'
import { auth } from '../lib/firebase'
import { api } from '../lib/api'
import { cn } from '../lib/utils'

type DatabaseNode =
  | 'Costos'
  | 'clientes'
  | 'codigos_streaming'
  | 'estadisticas'
  | 'limites_codigos'
  | 'opiniones'
  | 'usuarios'

interface NodeConfig {
  key: DatabaseNode
  label: string
  description: string
  icon: LucideIcon
}

const NODES: NodeConfig[] = [
  { key: 'Costos', label: 'Costos', description: 'Costos y parametrizaciones internas.', icon: CircleDollarSign },
  { key: 'clientes', label: 'Clientes (legacy)', description: 'Nodo anterior de clientes, distinto de usuarios_clientes.', icon: UsersRound },
  { key: 'codigos_streaming', label: 'Códigos streaming', description: 'Códigos de acceso; también se busca la variante con acento.', icon: KeyRound },
  { key: 'estadisticas', label: 'Estadísticas', description: 'Contadores y métricas del negocio.', icon: BarChart3 },
  { key: 'limites_codigos', label: 'Límites de códigos', description: 'Topes de uso y asignación de códigos.', icon: Gauge },
  { key: 'opiniones', label: 'Opiniones', description: 'Reseñas y comentarios recibidos.', icon: MessageSquareText },
  { key: 'usuarios', label: 'Usuarios', description: 'Roles de admin y empleado; solo lectura y rol editable.', icon: ShieldCheck },
]

const MAX_FIELDS = 6
const ROLES = ['admin', 'empleado', 'cliente']

interface EditorState {
  key: string
  value: string
  isNew: boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : { valor: value }
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'null'
}

function readable(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return `[${value.length} elemento${value.length === 1 ? '' : 's'}]`
  if (typeof value === 'string') return value.length > 64 ? `${value.slice(0, 61)}…` : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    const summary = keys.slice(0, 3).join(', ')
    return `{ ${summary}${keys.length > 3 ? ', …' : ''} }`
  }
  return String(value)
}

function rankedFields(data: Record<string, unknown>): string[] {
  const counts = new Map<string, number>()
  Object.values(data).forEach((value) => {
    Object.keys(asRecord(value)).forEach((field) => {
      counts.set(field, (counts.get(field) ?? 0) + 1)
    })
  })
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([field]) => field)
}

/** RTDB no admite ".", "#", "$", "[", "]", "/" ni caracteres de control en las claves. */
function sanitizeKey(raw: string): string {
  return raw
    .trim()
    .replace(/[.#$[\]/]/g, '-')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, 120)
}

export function DatabasePage() {
  const { toast } = useToast()
  const { companyName } = useBrand()
  const currentUid = auth.currentUser?.uid ?? ''
  const [activeNode, setActiveNode] = useState<DatabaseNode>('Costos')
  const [records, setRecords] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [newKeyOpen, setNewKeyOpen] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const activeConfig = NODES.find((node) => node.key === activeNode) ?? NODES[0]

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecords(await api.database.list(activeNode))
    } catch (caught) {
      setRecords({})
      setError(caught instanceof Error ? caught.message : 'No pudimos leer este nodo de Firebase.')
    } finally {
      setLoading(false)
    }
  }, [activeNode])

  useEffect(() => {
    void load()
  }, [load])

  const entries = useMemo(
    () => Object.entries(records).sort(([a], [b]) => a.localeCompare(b)),
    [records],
  )
  const fields = useMemo(() => rankedFields(records), [records])
  const visibleFields = fields.slice(0, MAX_FIELDS)
  const hiddenFields = fields.slice(MAX_FIELDS)

  // Estadísticas suele ser un primitivo o un objeto de escalares: se edita como un todo.
  const rootMode =
    activeNode === 'estadisticas' &&
    (Object.prototype.hasOwnProperty.call(records, '__root__') ||
      !Object.values(records).some(isPlainObject))
  const rootValue = Object.prototype.hasOwnProperty.call(records, '__root__')
    ? records.__root__
    : records

  const changeNode = (node: DatabaseNode) => {
    setActiveNode(node)
    setExpandedKeys(new Set())
    setEditor(null)
    setDeleteTarget(null)
  }

  const openEditor = (key: string, value: unknown, isNew = false) => {
    // En usuarios se expone únicamente el campo rol, nunca el resto del perfil.
    const initial =
      activeNode === 'usuarios' && !isNew && isPlainObject(value)
        ? { rol: value.rol ?? '' }
        : value
    setEditor({ key, value: pretty(initial), isNew })
    setEditorError(null)
  }

  const confirmNewKey = () => {
    const key = sanitizeKey(newKey) || `registro-${Date.now()}`
    setNewKeyOpen(false)
    openEditor(key, {}, true)
  }

  const toggleExpanded = (key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const saveEditor = async () => {
    if (!editor) return
    setEditorError(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(editor.value)
    } catch (caught) {
      setEditorError(`JSON inválido: ${caught instanceof Error ? caught.message : 'revisa la sintaxis.'}`)
      return
    }

    if (editor.key !== '__root__' && !isPlainObject(parsed)) {
      setEditorError('El registro debe ser un objeto JSON (por ejemplo, { "campo": "valor" }).')
      return
    }

    if (activeNode === 'usuarios') {
      if (!isPlainObject(parsed)) {
        setEditorError('En usuarios solo se admite un objeto con el campo rol.')
        return
      }
      const fields = Object.keys(parsed)
      if (fields.length !== 1 || fields[0] !== 'rol') {
        setEditorError('Solo se puede modificar el campo rol; quita cualquier otro campo.')
        return
      }
      if (!ROLES.includes(String(parsed.rol))) {
        setEditorError(`El rol debe ser uno de: ${ROLES.join(', ')}.`)
        return
      }
    }

    setSaving(true)
    try {
      await api.database.save(activeNode, editor.key, parsed)
      const label = editor.key
      setEditor(null)
      toast(editor.isNew ? `Registro "${label}" agregado.` : `Registro "${label}" guardado.`)
      await load()
    } catch (caught) {
      setEditorError(caught instanceof Error ? caught.message : 'No pudimos guardar el registro.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || activeNode === 'usuarios') return
    setDeleting(true)
    try {
      await api.database.remove(activeNode, deleteTarget)
      const key = deleteTarget
      setDeleteTarget(null)
      toast(key === '__root__' ? `Nodo ${activeNode} borrado.` : `Registro "${key}" eliminado.`)
      await load()
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'No pudimos eliminar el registro.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const ActiveIcon = activeConfig.icon

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Configuración"
        title="Base de datos"
        description={`Administra los nodos de Realtime Database de ${companyName} que aún no tienen una página dedicada. Los campos se muestran de forma genérica porque su estructura puede variar.`}
        actions={
          <span className="badge border-white/[0.12] bg-white/[0.04] text-white/55">
            <Database size={12} />
            RTDB
          </span>
        }
      />

      <div className="no-scrollbar panel mb-5 flex gap-1 overflow-x-auto p-2" role="tablist" aria-label="Nodos de la base de datos">
        {NODES.map((node) => {
          const Icon = node.icon
          const active = node.key === activeNode
          return (
            <button
              key={node.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeNode(node.key)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition',
                active
                  ? 'bg-primary/15 text-primary shadow-glow-sm'
                  : 'text-white/45 hover:bg-white/[0.05] hover:text-white',
              )}
              title={node.description}
            >
              <Icon size={15} />
              {node.label}
            </button>
          )
        })}
      </div>

      <section className="panel mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            <ActiveIcon size={12} />
            {activeConfig.label}
          </Badge>
          <span className="font-mono text-xs text-white/35">/ {activeNode}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-white/40">
            {rootMode ? '1 nodo' : `${entries.length} registro${entries.length === 1 ? '' : 's'}`} · {fields.length} campo{fields.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-xs"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            Actualizar
          </button>
          <button
            type="button"
            className="btn-primary px-3 py-2 text-xs"
            onClick={() => {
              setNewKey('')
              setNewKeyOpen(true)
            }}
            disabled={activeNode === 'usuarios'}
            title={activeNode === 'usuarios' ? 'Los usuarios se crean desde la tienda.' : 'Agregar registro'}
          >
            <Plus size={14} />
            Agregar registro
          </button>
        </div>
      </section>

      {activeNode === 'usuarios' ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs leading-5 text-amber-100/70">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <p>
            <strong className="font-semibold text-amber-100">Edición restringida.</strong> Solo se puede
            modificar el campo <code className="font-mono">rol</code> (admin, empleado o cliente) mediante
            el editor JSON. No se puede eliminar ningún uid —incluido el tuyo
            {currentUid ? ` (${currentUid})` : ''}— ni crear usuarios desde aquí.
          </p>
        </div>
      ) : null}

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
        ) : rootMode ? (
          <div className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  JSON crudo del nodo
                </p>
                <p className="mt-1 font-mono text-xs text-white/35">/ {activeNode}</p>
              </div>
              <button
                type="button"
                className="btn-secondary px-3 py-2 text-xs"
                onClick={() => openEditor('__root__', rootValue)}
              >
                <FileJson size={14} />
                Ver/Editar JSON
              </button>
            </div>
            <pre className="no-scrollbar max-h-[420px] overflow-auto rounded-2xl border border-white/[0.07] bg-black/25 p-4 font-mono text-xs leading-6 text-white/65">
              {pretty(rootValue)}
            </pre>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={ActiveIcon}
            title="Este nodo está vacío"
            description="Agrega un registro para comenzar o revisa el nombre del nodo en Firebase Realtime Database."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="table-head">Clave</th>
                  {visibleFields.map((field) => (
                    <th key={field} className="table-head" title={field}>
                      {field}
                    </th>
                  ))}
                  <th className="table-head text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {entries.map(([key, value]) => {
                  const record = asRecord(value)
                  const expanded = expandedKeys.has(key)
                  return (
                    <Fragment key={key}>
                      <tr className="transition hover:bg-white/[0.025]">
                        <td className="table-cell">
                          <span className="font-mono text-xs text-white/75">{key}</span>
                        </td>
                        {visibleFields.map((field) => (
                          <td
                            key={field}
                            className="table-cell max-w-[220px] truncate font-mono text-xs"
                            title={readable(record[field])}
                          >
                            {readable(record[field])}
                          </td>
                        ))}
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-1.5">
                            {hiddenFields.length > 0 ? (
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => toggleExpanded(key)}
                                title={expanded ? 'Ocultar campos' : `Ver ${hiddenFields.length} campos más`}
                                aria-label={expanded ? 'Ocultar campos' : 'Expandir campos'}
                              >
                                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="btn-secondary px-3 py-2 text-xs"
                              onClick={() => openEditor(key, value)}
                            >
                              <FileJson size={14} />
                              Ver/Editar JSON
                            </button>
                            <button
                              type="button"
                              className="icon-btn hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                              onClick={() => setDeleteTarget(key)}
                              disabled={activeNode === 'usuarios'}
                              title={activeNode === 'usuarios' ? 'Los usuarios no se pueden eliminar' : `Eliminar ${key}`}
                              aria-label={`Eliminar ${key}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && hiddenFields.length > 0 ? (
                        <tr className="bg-white/[0.02]">
                          <td className="table-cell" colSpan={visibleFields.length + 2}>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {hiddenFields.map((field) => (
                                <div
                                  key={field}
                                  className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                                >
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                                    {field}
                                  </p>
                                  <p className="mt-1 break-all font-mono text-xs text-white/60">
                                    {readable(record[field])}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={editor !== null}
        onClose={() => (saving ? undefined : setEditor(null))}
        title={editor ? `Registro · ${editor.key}` : 'Editar JSON'}
        description={
          editor?.isNew
            ? `Nuevo registro en ${activeNode}`
            : editor?.key === '__root__'
              ? `Edición completa del nodo ${activeNode}`
              : `Nodo ${activeNode}`
        }
        size="lg"
        footer={
          editor ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setEditor(null)} disabled={saving}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={() => void saveEditor()} disabled={saving}>
                {saving ? <Spinner size={14} /> : <Save size={15} />}
                Guardar
              </button>
            </>
          ) : null
        }
      >
        {editor ? (
          <div className="space-y-4">
            {activeNode === 'usuarios' ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[11px] leading-5 text-amber-100/70">
                <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                <p>
                  Este registro solo acepta <code className="font-mono">rol</code> con valores{' '}
                  <code className="font-mono">admin</code>, <code className="font-mono">empleado</code> o{' '}
                  <code className="font-mono">cliente</code>. Los demás datos del usuario no se modifican.
                </p>
              </div>
            ) : null}
            <div>
              <label htmlFor="db-json-editor" className="field-label">
                JSON del registro
              </label>
              <textarea
                id="db-json-editor"
                className="field min-h-[320px] resize-y font-mono text-xs leading-6"
                value={editor.value}
                onChange={(event) => setEditor({ ...editor, value: event.target.value })}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <FormError message={editorError} />
            <p className="text-[11px] leading-5 text-white/30">
              Clave RTDB: <code className="font-mono text-white/50">{editor.key}</code>
              {editor.key === '__root__' ? ' · Se guardará el nodo completo.' : ''}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={newKeyOpen}
        onClose={() => setNewKeyOpen(false)}
        title="Nuevo registro"
        description={`Nodo: ${activeNode}`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setNewKeyOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={confirmNewKey}>
              <Plus size={14} />
              Continuar
            </button>
          </>
        }
      >
        <label htmlFor="db-new-key" className="field-label">
          Clave del registro
        </label>
        <input
          id="db-new-key"
          className="field"
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') confirmNewKey()
          }}
          placeholder="Ej. configuracion-general"
          maxLength={120}
          autoFocus
        />
        <p className="mt-2 text-[11px] leading-5 text-white/35">
          Si la dejas vacía se genera una clave con la fecha y hora. Los caracteres no válidos para RTDB se convierten en guiones.
        </p>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar registro"
        description={
          deleteTarget === '__root__'
            ? `Esto borrará TODO el nodo ${activeNode} en Realtime Database. Esta acción no se puede deshacer.`
            : `Se eliminará "${deleteTarget}" del nodo ${activeNode}. Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
