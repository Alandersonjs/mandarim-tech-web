import { PenLine } from 'lucide-react'
import { categoryLabel, levelLabel } from '../../lib/format'
import type { HSKLevel, TermCategory } from '../../types/api'

const LEVEL_STYLES: Record<HSKLevel, string> = {
  'HSK1_3.0': 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300',
  'HSK2_3.0': 'bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300',
  'HSK3_3.0': 'bg-violet-500/15 text-violet-700 ring-violet-500/30 dark:text-violet-300',
  'HSK4_3.0': 'bg-fuchsia-500/15 text-fuchsia-700 ring-fuchsia-500/30 dark:text-fuchsia-300',
  HSK_TECH: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
}

const BASE = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset'

export function LevelBadge({ level }: { level: HSKLevel }) {
  return (
    <span className={`${BASE} font-mono ${LEVEL_STYLES[level]}`} title={level}>
      {levelLabel(level)}
    </span>
  )
}

export function CategoryBadge({ category }: { category: TermCategory }) {
  return (
    <span className={`${BASE} bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300`}>
      {categoryLabel(category)}
    </span>
  )
}

export function HandwritingBadge() {
  return (
    <span className={`${BASE} bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300`} title="Caractere de escrita obrigatória (书写字)">
      <PenLine className="h-3 w-3" aria-hidden />
      书写
    </span>
  )
}
