import type { ReactNode } from 'react'
import type { VocabularyTerm } from '../types/api'
import { AudioButton } from './AudioButton'
import { RadicalBlocks } from './RadicalBlocks'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>
      {children}
    </section>
  )
}

/** Everything a beginner needs about a term: Pinyin first, then guide, radicals and example. */
export function TermDetails({ term }: { term: VocabularyTerm }) {
  return (
    <div className="space-y-5">
      <Section title="Pinyin">
        <p className="text-2xl font-semibold tracking-wide text-emerald-600 dark:text-emerald-300">{term.pinyin}</p>
        <p className="font-mono text-sm text-slate-500 dark:text-slate-400" title="Pinyin com tons numéricos">
          {term.pinyin_numeric}
        </p>
      </Section>

      {term.pinyin_guide && (
        <Section title="Como pronunciar (PT-BR)">
          <p className="rounded-lg bg-slate-500/10 px-3 py-2 text-sm leading-relaxed">{term.pinyin_guide}</p>
        </Section>
      )}

      {term.radical_breakdown.length > 0 && (
        <Section title="Blocos semânticos (radicais)">
          <RadicalBlocks items={term.radical_breakdown} />
        </Section>
      )}

      <Section title="Exemplo">
        <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-300 p-3 dark:border-slate-700">
          <div className="space-y-1">
            <p className="font-hanzi text-lg">{term.example_sentence}</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{term.example_pinyin}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{term.example_translation}</p>
          </div>
          <AudioButton text={term.example_sentence} label="Ouvir frase de exemplo" />
        </div>
      </Section>
    </div>
  )
}
