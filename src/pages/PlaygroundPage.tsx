import { Hammer, RotateCcw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CompileResult } from '../components/CompileResult'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/Feedback'
import { levelLabel } from '../lib/format'
import { EMPTY_FORM, PRESETS, type PlaygroundForm } from '../lib/presets'
import { ROLE_STYLES } from '../lib/roles'
import { compileSentence, toApiError, type ApiError } from '../services/api'
import { HSK_LEVELS, type CompileResponse, type CompileRole, type HSKLevel } from '../types/api'

type TextField = 'subject' | 'time' | 'place' | 'verb' | 'object'

const SLOTS: { field: TextField; role: CompileRole; placeholder: string }[] = [
  { field: 'subject', role: 'S', placeholder: '我 ou wo' },
  { field: 'time', role: 'T', placeholder: '昨天 ou zuotian' },
  { field: 'place', role: 'L', placeholder: '公司 ou gongsi' },
  { field: 'verb', role: 'V', placeholder: '修复 ou xiufu' },
  { field: 'object', role: 'O', placeholder: 'bug, 代码, daima…' },
]

export function PlaygroundPage() {
  const [form, setForm] = useState<PlaygroundForm>({
    ...EMPTY_FORM,
    ...PRESETS[0].values,
  })
  const [result, setResult] = useState<CompileResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const hasText = SLOTS.some(({ field }) => form[field].trim() !== '')

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!hasText || loading) return
    setLoading(true)
    setError(null)
    try {
      setResult(
        await compileSentence({
          subject: form.subject,
          time: form.time,
          place: form.place,
          verb: form.verb,
          object: form.object,
          completed: form.completed,
          le_position: form.lePosition,
          target_level: form.targetLevel || undefined,
        }),
      )
    } catch (caught) {
      setResult(null)
      setError(await toApiError(caught))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Playground S-T-L-V-O</h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Em mandarim a frase é uma pilha de chamadas fixa: <strong>Sujeito → Tempo → Local → Verbo → Objeto</strong>. Preencha as peças
          (em Hanzi ou Pinyin) e o compilador monta e valida a frase.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <label className="block space-y-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Frases de TI prontas</span>
          <select
            aria-label="Selecionar frase de exemplo"
            value=""
            onChange={(event) => {
              const preset = PRESETS.find((item) => item.id === event.target.value)
              if (preset) {
                setForm({ ...EMPTY_FORM, ...preset.values })
                setResult(null)
                setError(null)
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Escolha uma frase para preencher os campos…</option>
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SLOTS.map(({ field, role, placeholder }) => {
            const style = ROLE_STYLES[role]
            return (
              <label key={field} className="block space-y-1.5">
                <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.tag}`}>
                  {role} · {style.name}
                </span>
                <input
                  type="text"
                  value={form[field]}
                  onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                  placeholder={placeholder}
                  aria-label={`${style.name} (${role})`}
                  maxLength={60}
                  autoComplete="off"
                  spellCheck={false}
                  className={`h-11 w-full rounded-lg border-2 bg-transparent px-3 font-hanzi text-base placeholder:font-sans placeholder:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${style.block}`}
                />
              </label>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.completed}
              onChange={(event) => setForm({ ...form, completed: event.target.checked })}
              className="accent-emerald-500"
            />
            Ação concluída (partícula 了)
          </label>

          {form.completed && (
            <label className="flex items-center gap-2">
              <span className="text-slate-500">Posição do 了</span>
              <select
                value={form.lePosition}
                onChange={(event) => setForm({ ...form, lePosition: event.target.value as PlaygroundForm['lePosition'] })}
                className="rounded-lg border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="sentence_end">Fim da frase</option>
                <option value="after_verb">Depois do verbo</option>
              </select>
            </label>
          )}

          <label className="flex items-center gap-2">
            <span className="text-slate-500">Nível-alvo</span>
            <select
              value={form.targetLevel}
              onChange={(event) => setForm({ ...form, targetLevel: event.target.value as HSKLevel | '' })}
              className="rounded-lg border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Sem meta</option>
              {HSK_LEVELS.filter((level) => level !== 'HSK_TECH').map((level) => (
                <option key={level} value={level}>
                  {levelLabel(level)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!hasText || loading} size="lg">
            <Hammer className="h-5 w-5" aria-hidden />
            {loading ? 'Compilando…' : 'Compilar frase'}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setForm(EMPTY_FORM)
              setResult(null)
              setError(null)
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Limpar
          </Button>
        </div>
      </form>

      {error && <ErrorState error={error} onRetry={() => void submit()} />}
      {result && <CompileResult result={result} />}
    </div>
  )
}
