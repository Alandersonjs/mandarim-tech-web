import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AudioButton } from '../components/AudioButton'
import { TermDetailDialog } from '../components/TermDetailDialog'
import { Button } from '../components/ui/Button'
import { CategoryBadge, HandwritingBadge, LevelBadge } from '../components/ui/Badges'
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { categoryLabel, levelLabel, pluralize } from '../lib/format'
import { searchVocabulary } from '../services/api'
import { HSK_LEVELS, TERM_CATEGORIES, type HSKLevel, type TermCategory, type VocabularyTerm } from '../types/api'

const PAGE_SIZE = 12

export function VocabularyPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<TermCategory | undefined>()
  const [level, setLevel] = useState<HSKLevel | undefined>()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<VocabularyTerm | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const result = useAsync(
    (signal) =>
      searchVocabulary({ search: debouncedSearch, category, hsk_level: level, page, page_size: PAGE_SIZE }, signal),
    [debouncedSearch, category, level, page],
  )

  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }
  const hasFilters = Boolean(search || category || level)
  const data = result.data

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Vocabulário & HSK 3.0</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Busque em português, Hanzi ou Pinyin — com ou sem tom (<span className="font-mono">shuju</span>,{' '}
          <span className="font-mono">shu4ju4</span>, <span className="font-mono">shùjù</span>).
        </p>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => changeFilter(setSearch)(event.target.value)}
            placeholder="Buscar: banco de dados, 数据库, shuju…"
            aria-label="Buscar vocabulário"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-base placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900"
          />
          {search && (
            <button
              type="button"
              onClick={() => changeFilter(setSearch)('')}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoria">
          <FilterChip active={!category} onClick={() => changeFilter(setCategory)(undefined)}>
            Todas
          </FilterChip>
          {TERM_CATEGORIES.map((value) => (
            <FilterChip key={value} active={category === value} onClick={() => changeFilter(setCategory)(value)}>
              {categoryLabel(value)}
            </FilterChip>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Nível</span>
            <select
              value={level ?? ''}
              onChange={(event) => changeFilter(setLevel)((event.target.value || undefined) as HSKLevel | undefined)}
              aria-label="Filtrar por nível HSK"
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Todos</option>
              {HSK_LEVELS.map((value) => (
                <option key={value} value={value}>
                  {levelLabel(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {result.error ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : !data ? (
        <Spinner label="Carregando vocabulário…" />
      ) : data.items.length === 0 ? (
        <EmptyState title="Nenhum termo encontrado">
          {hasFilters ? (
            <>
              Tente outra busca ou{' '}
              <button
                type="button"
                className="text-emerald-600 underline dark:text-emerald-300"
                onClick={() => {
                  setSearch('')
                  setCategory(undefined)
                  setLevel(undefined)
                  setPage(1)
                }}
              >
                limpe os filtros
              </button>
              .
            </>
          ) : (
            'O vocabulário ainda está vazio.'
          )}
        </EmptyState>
      ) : (
        <>
          <p className={`text-xs text-slate-500 transition dark:text-slate-400 ${result.loading ? 'opacity-50' : ''}`} aria-live="polite">
            {pluralize(data.total, 'termo encontrado', 'termos encontrados')}
          </p>
          <ul className={`grid gap-3 transition sm:grid-cols-2 xl:grid-cols-3 ${result.loading ? 'opacity-60' : ''}`}>
            {data.items.map((term) => (
              <li key={term.id}>
                <TermCard term={term} onOpen={() => setSelected(term)} />
              </li>
            ))}
          </ul>

          {data.total_pages > 1 && (
            <nav aria-label="Paginação" className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
              </Button>
              <span className="font-mono text-xs text-slate-500">
                {data.page} / {data.total_pages}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>
                Próxima <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </nav>
          )}
        </>
      )}

      {selected && <TermDetailDialog term={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        active
          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function TermCard({ term, onOpen }: { term: VocabularyTerm; onOpen: () => void }) {
  return (
    <div className="group flex h-full items-stretch gap-2 rounded-2xl border border-slate-300 bg-white transition hover:border-emerald-500/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalhes de ${term.hanzi} (${term.portuguese})`}
        className="flex flex-1 flex-col gap-2 rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <div className="flex flex-wrap gap-1.5">
          <LevelBadge level={term.hsk_level} />
          <CategoryBadge category={term.category} />
          {term.is_handwriting_required && <HandwritingBadge />}
        </div>
        <span className="font-hanzi text-3xl leading-tight">{term.hanzi}</span>
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{term.pinyin}</span>
        <span className="text-sm text-slate-600 dark:text-slate-300">{term.portuguese}</span>
      </button>
      <div className="p-3">
        <AudioButton text={term.hanzi} label={`Ouvir ${term.hanzi}`} />
      </div>
    </div>
  )
}
