import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { ROLE_STYLES } from '../lib/roles'
import { toneClasses, toneName } from '../lib/tones'
import type { CheckItem, CompileResponse } from '../types/api'
import { AudioButton } from './AudioButton'
import { LevelBadge } from './ui/Badges'

function CheckIcon({ check }: { check: CheckItem }) {
  if (check.passed) {
    return check.severity === 'info' ? (
      <Info className="h-4 w-4 shrink-0 text-sky-500" aria-label="Informação" />
    ) : (
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Passou" />
    )
  }
  return check.severity === 'error' ? (
    <XCircle className="h-4 w-4 shrink-0 text-red-500" aria-label="Falhou" />
  ) : (
    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="Atenção" />
  )
}

function Verdict({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/15 text-red-700 dark:text-red-300'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <XCircle className="h-3.5 w-3.5" aria-hidden />}
      {ok ? yes : no}
    </span>
  )
}

/** Visual breakdown of a compiled sentence: coloured syntax blocks, sentence, syllables and checklist. */
export function CompileResult({ result }: { result: CompileResponse }) {
  const task = result.hsk_task_check
  return (
    <div className="animate-slide-up space-y-6" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <Verdict ok={result.structure_valid} yes="Estrutura válida" no="Estrutura com erros" />
        <Verdict ok={task.conforms} yes="Conforme tarefa HSK" no="Não conforme" />
        <code className="rounded bg-slate-500/10 px-2 py-1 font-mono text-xs">{result.structure_pattern}</code>
        {task.estimated_level && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            Nível estimado: <LevelBadge level={task.estimated_level} />
          </span>
        )}
      </div>

      <ul className="flex flex-wrap items-stretch gap-3" aria-label="Blocos sintáticos">
        {result.components.map((component, index) => {
          const style = ROLE_STYLES[component.role]
          return (
            <li
              key={`${component.role}-${index}`}
              className={`flex min-w-[7rem] flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center ${style.block}`}
            >
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.tag}`}>
                {component.role === 'LE' ? '了' : component.role} · {style.name}
              </span>
              <span className="font-hanzi text-3xl leading-tight" lang="zh-CN">
                {component.hanzi}
              </span>
              <span className="text-sm font-medium">{component.pinyin}</span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{component.pinyin_numeric}</span>
              {component.hsk_level && <LevelBadge level={component.hsk_level} />}
              {!component.resolved && (
                <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" aria-hidden /> não reconhecido
                </span>
              )}
              {component.note && <span className="max-w-[10rem] text-[11px] leading-snug text-slate-500 dark:text-slate-400">{component.note}</span>}
            </li>
          )
        })}
      </ul>

      <section className="space-y-2 rounded-2xl border border-slate-300 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-hanzi text-3xl" lang="zh-CN">
              {result.sentence_hanzi}
            </p>
            <p className="text-lg text-emerald-700 dark:text-emerald-300">{result.sentence_pinyin}</p>
            <p className="font-mono text-sm text-slate-500 dark:text-slate-400" title="Pinyin com tons numéricos">
              {result.sentence_pinyin_numeric}
            </p>
          </div>
          <AudioButton text={result.sentence_hanzi} size="lg" label="Ouvir a frase" />
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sílabas e tons</h3>
        <ul className="flex flex-wrap gap-1.5" aria-label="Sílabas com tons numéricos">
          {result.syllables.map((syllable, index) => (
            <li
              key={`${syllable.syllable}-${index}`}
              title={toneName(syllable.tone)}
              className={`flex flex-col items-center rounded-lg border px-2 py-1 ${toneClasses(syllable.tone)}`}
            >
              <span className="font-mono text-sm font-semibold">{syllable.syllable}</span>
              <span className="font-hanzi text-xs opacity-80">{syllable.hanzi ?? '·'}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500">
          Cores dos tons: <span className="text-rose-500">1</span> · <span className="text-amber-500">2</span> ·{' '}
          <span className="text-emerald-500">3</span> · <span className="text-sky-500">4</span> · 0 neutro
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Checklist de estrutura e HSK</h3>
        <ul className="space-y-1.5">
          {task.checks.map((check) => (
            <li key={check.name} className="flex items-start gap-2 text-sm">
              <CheckIcon check={check} />
              <span>
                <strong className="font-medium">{check.name}:</strong> <span className="text-slate-600 dark:text-slate-300">{check.message}</span>
              </span>
            </li>
          ))}
        </ul>
        {task.technical_terms.length > 0 && (
          <p className="text-xs text-slate-500">
            Termos técnicos (fora das listas HSK): <span className="font-hanzi">{task.technical_terms.join('、')}</span>
          </p>
        )}
        <p className="text-[11px] italic text-slate-500">{task.disclaimer}</p>
      </section>
    </div>
  )
}
