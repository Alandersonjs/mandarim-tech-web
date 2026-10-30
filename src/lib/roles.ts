import type { CompileRole } from '../types/api'

export interface RoleStyle {
  /** Short Portuguese name used on input labels and blocks. */
  name: string
  /** Static class strings (Tailwind only generates classes it can see in the source). */
  block: string
  tag: string
}

export const ROLE_STYLES: Record<CompileRole, RoleStyle> = {
  S: {
    name: 'Sujeito',
    block: 'border-sky-500/50 bg-sky-500/10',
    tag: 'bg-sky-500 text-white',
  },
  T: {
    name: 'Tempo',
    block: 'border-amber-500/50 bg-amber-500/10',
    tag: 'bg-amber-500 text-slate-950',
  },
  L: {
    name: 'Local',
    block: 'border-emerald-500/50 bg-emerald-500/10',
    tag: 'bg-emerald-500 text-slate-950',
  },
  V: {
    name: 'Verbo',
    block: 'border-rose-500/50 bg-rose-500/10',
    tag: 'bg-rose-500 text-white',
  },
  O: {
    name: 'Objeto',
    block: 'border-violet-500/50 bg-violet-500/10',
    tag: 'bg-violet-500 text-white',
  },
  LE: {
    name: 'Partícula 了',
    block: 'border-slate-400/50 bg-slate-500/10',
    tag: 'bg-slate-500 text-white',
  },
}
