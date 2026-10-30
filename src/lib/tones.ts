/** Classic tone colouring for Pinyin (1 red, 2 amber, 3 green, 4 blue, neutral grey). */
export function toneClasses(tone: number | null): string {
  switch (tone) {
    case 1:
      return 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    case 2:
      return 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    case 3:
      return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 4:
      return 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300'
    default:
      return 'border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300'
  }
}

export function toneName(tone: number | null): string {
  switch (tone) {
    case 1:
      return '1º tom (alto e plano)'
    case 2:
      return '2º tom (ascendente)'
    case 3:
      return '3º tom (desce e sobe)'
    case 4:
      return '4º tom (descendente)'
    case 0:
      return 'tom neutro'
    default:
      return 'sem tom (termo não chinês)'
  }
}
