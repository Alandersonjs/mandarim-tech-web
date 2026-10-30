import { parseRadicalBlock } from '../lib/radicals'

/** "Semantic Lego": one tile per character with its meaning and, when known, its radical. */
export function RadicalBlocks({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Decomposição em blocos semânticos">
      {items.map((raw, index) => {
        const block = parseRadicalBlock(raw)
        return (
          <li
            key={`${raw}-${index}`}
            className="flex min-w-[6.5rem] flex-col items-center gap-1 rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800/50"
          >
            <span className="font-hanzi text-3xl leading-none">{block.char}</span>
            <span className="text-xs font-medium">{block.meaning}</span>
            {block.radical && (
              <span
                className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300"
                title={`Radical ${block.radical.symbol}: ${block.radical.description}`}
              >
                <span className="font-hanzi">{block.radical.symbol}</span> {block.radical.description}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
