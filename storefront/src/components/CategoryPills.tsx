import {
  Dumbbell,
  GraduationCap,
  Infinity as InfinityIcon,
  Layers3,
  LayoutGrid,
  Music2,
  Play,
  Scissors,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORY_GRADIENTS, CATEGORY_LABELS } from '../lib/api'
import { cn } from '../lib/utils'
import type { Category } from '../types'

interface CategoryPillsProps {
  active: Category | 'all'
  onSelect: (category: Category | 'all') => void
  onCombos: () => void
}

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  Video: Play,
  IA: Sparkles,
  Edicion: Scissors,
  Escolar: GraduationCap,
  Musica: Music2,
  Deportes: Dumbbell,
  Lifelong: InfinityIcon,
  AdultPlus: ShieldAlert,
}

const ORDER: Category[] = [
  'Video',
  'IA',
  'Edicion',
  'Escolar',
  'Musica',
  'Deportes',
  'Lifelong',
  'AdultPlus',
]

export function CategoryPills({ active, onSelect, onCombos }: CategoryPillsProps) {
  return (
    <section id="categorias" className="page-shell scroll-mt-28 pt-10 sm:pt-14">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Encuentra tu próximo upgrade
          </p>
          <h2 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
            Explora por categoría
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onSelect('all')}
          className="shrink-0 text-[11px] font-medium text-white/45 transition hover:text-white"
        >
          Ver todo
        </button>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition duration-300',
            active === 'all'
              ? 'border-white/20 bg-white text-[#0a0a12]'
              : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white',
          )}
        >
          <LayoutGrid size={14} />
          Todos
        </button>

        {ORDER.map((category) => {
          const Icon = CATEGORY_ICONS[category]
          const isActive = active === category
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(category)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition duration-300',
                isActive
                  ? `border-transparent bg-gradient-to-r ${CATEGORY_GRADIENTS[category]} text-white shadow-glow-sm`
                  : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white',
                category === 'AdultPlus' && !isActive && 'border-red-400/15 text-red-200/70',
              )}
            >
              <Icon size={14} />
              {CATEGORY_LABELS[category]}
            </button>
          )
        })}

        <span className="mx-1 hidden h-8 w-px shrink-0 self-center bg-white/10 sm:block" />

        <button
          type="button"
          onClick={onCombos}
          className="group flex shrink-0 items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-white transition duration-300 hover:border-primary/60 hover:bg-primary/20"
        >
          <Layers3 size={14} className="text-accent" />
          Crear combo
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-black">
            Ahorra
          </span>
        </button>
      </div>
    </section>
  )
}
