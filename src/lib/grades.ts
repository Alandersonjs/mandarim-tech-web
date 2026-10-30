import type { Grade } from '../types/api'

export interface GradeMeta {
  grade: Grade
  label: string
  hint: string
  /** Static class strings (Tailwind only generates classes it can see in the source). */
  classes: string
}

export const GRADES: readonly GradeMeta[] = [
  { grade: 0, label: 'Apagão', hint: 'Não lembrei de nada', classes: 'border-red-500/50 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-300' },
  { grade: 1, label: 'Errei', hint: 'Lembrei só depois de ver', classes: 'border-orange-500/50 bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 dark:text-orange-300' },
  { grade: 2, label: 'Quase', hint: 'Errei, mas parecia fácil', classes: 'border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300' },
  { grade: 3, label: 'Difícil', hint: 'Acertei com esforço', classes: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-300' },
  { grade: 4, label: 'Bom', hint: 'Acertei com hesitação', classes: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300' },
  { grade: 5, label: 'Perfeito', hint: 'Resposta imediata', classes: 'border-teal-500/50 bg-teal-500/10 text-teal-700 hover:bg-teal-500/20 dark:text-teal-300' },
]

export function gradeMeta(grade: Grade): GradeMeta {
  return GRADES[grade]
}
