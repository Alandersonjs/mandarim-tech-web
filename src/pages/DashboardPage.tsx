import { ArrowRight, BookOpen, CalendarCheck, Code2, Flame, Layers, Target } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ErrorState, Spinner } from '../components/ui/Feedback'
import { useAsync } from '../hooks/useAsync'
import { levelLabel, pluralize } from '../lib/format'
import { challengeProgress, computeStreak, loadStats, todaySummary } from '../lib/studyStats'
import { getDueCards, getHskLevels } from '../services/api'
import type { HSKLevelSummary } from '../types/api'

function StatCard({ icon, title, children, accent }: { icon: ReactNode; title: string; children: ReactNode; accent: string }) {
  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className={`mb-3 flex items-center gap-2 text-sm font-medium ${accent}`}>
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function LevelRow({ summary }: { summary: HSKLevelSummary }) {
  const target = summary.target_cumulative_words
  const percent = target ? Math.min(100, Math.round((summary.seeded_terms / target) * 100)) : null
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-mono font-medium">{levelLabel(summary.level)}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {target
            ? `${summary.seeded_terms} de ${target} palavras (${percent}%)`
            : `${pluralize(summary.seeded_terms, 'termo técnico', 'termos técnicos')}`}
        </span>
      </div>
      {/* HSK_TECH has no official target, so a bar would only suggest a progress that does not exist. */}
      {percent !== null && (
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-label={`Cobertura de ${levelLabel(summary.level)}`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${percent}%` }} />
        </div>
      )}
    </li>
  )
}

export function DashboardPage() {
  const due = useAsync((signal) => getDueCards(1, signal), [])
  const levels = useAsync((signal) => getHskLevels(signal), [])

  const now = useMemo(() => new Date(), [])
  const stats = useMemo(() => loadStats(), [])
  const streak = computeStreak(stats, now)
  const today = todaySummary(stats, now)
  const challenge = challengeProgress(stats, now)

  const totalTerms = levels.data?.levels.reduce((sum, level) => sum + level.seeded_terms, 0) ?? 0
  const studied = stats.reviewedTermIds.length
  const totalDue = due.data?.total_due ?? 0
  const backendDown = due.error && levels.error

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">
          Bem-vindo de volta, <span className="font-mono text-emerald-500">dev</span> 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Rumo ao Novo HSK 3.0 em 30 dias: um pouco de revisão todos os dias vence qualquer maratona.
        </p>
      </header>

      {backendDown ? (
        <ErrorState
          error={due.error!}
          onRetry={() => {
            due.reload()
            levels.reload()
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<Flame className="h-4 w-4" aria-hidden />} title="Ofensiva" accent="text-orange-500">
              <p className="text-4xl font-bold">
                {streak.current}
                <span className="ml-1 text-base font-medium text-slate-500">{streak.current === 1 ? 'dia' : 'dias'}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {streak.current === 0
                  ? 'Faça uma revisão hoje para começar.'
                  : streak.activeToday
                    ? 'Mantida hoje. Continue assim!'
                    : 'Revise hoje para não perder a sequência.'}
              </p>
            </StatCard>

            <StatCard icon={<CalendarCheck className="h-4 w-4" aria-hidden />} title="Hoje" accent="text-sky-500">
              <p className="text-4xl font-bold">
                {today.reviews}
                <span className="ml-1 text-base font-medium text-slate-500">{today.reviews === 1 ? 'revisão' : 'revisões'}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {today.accuracy === null ? 'Nenhuma revisão ainda.' : `Precisão de ${today.accuracy}%.`}
              </p>
            </StatCard>

            <StatCard icon={<Target className="h-4 w-4" aria-hidden />} title="Desafio de 30 dias" accent="text-violet-500">
              {challenge.started ? (
                <>
                  <p className="text-4xl font-bold">
                    {challenge.day}
                    <span className="ml-1 text-base font-medium text-slate-500">/ {challenge.totalDays}</span>
                  </p>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                    role="progressbar"
                    aria-label="Progresso do desafio de 30 dias"
                    aria-valuenow={Math.round((challenge.day / challenge.totalDays) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${(challenge.day / challenge.totalDays) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {challenge.finished ? 'Desafio concluído. Parabéns!' : `Faltam ${challenge.daysLeft} dias.`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Começa na sua primeira revisão. O dia 1 é hoje!</p>
              )}
            </StatCard>

            <StatCard icon={<Layers className="h-4 w-4" aria-hidden />} title="Para revisar" accent="text-emerald-500">
              {due.loading ? (
                <Spinner label="" />
              ) : (
                <>
                  <p className="text-4xl font-bold">{totalDue}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {totalDue === 0 ? 'Tudo em dia!' : pluralize(totalDue, 'cartão devido', 'cartões devidos')}
                  </p>
                </>
              )}
            </StatCard>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link
              to="/revisao"
              className="group flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 transition hover:bg-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <span>
                <span className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                  <Layers className="h-5 w-5" aria-hidden /> Revisar agora
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Flashcards com SM-2 e áudio neural</span>
              </span>
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              to="/vocabulario"
              className="group flex items-center justify-between rounded-2xl border border-slate-300 p-5 transition hover:border-sky-500/60 hover:bg-sky-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:border-slate-800"
            >
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  <BookOpen className="h-5 w-5 text-sky-500" aria-hidden /> Explorar vocabulário
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">TI, ERP e negócios com radicais</span>
              </span>
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              to="/playground"
              className="group flex items-center justify-between rounded-2xl border border-slate-300 p-5 transition hover:border-violet-500/60 hover:bg-violet-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:border-slate-800"
            >
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  <Code2 className="h-5 w-5 text-violet-500" aria-hidden /> Playground S-T-L-V-O
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Monte frases e veja a sintaxe em blocos</span>
              </span>
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>

          <section className="rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">Progresso no HSK 3.0</h2>
              {levels.data && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Você já revisou <strong className="text-emerald-600 dark:text-emerald-300">{studied}</strong> de {totalTerms} termos disponíveis
                </p>
              )}
            </div>
            {levels.loading ? (
              <Spinner label="Carregando níveis…" />
            ) : levels.error ? (
              <ErrorState error={levels.error} onRetry={levels.reload} />
            ) : levels.data ? (
              <>
                <ul className="space-y-4">
                  {levels.data.levels.map((summary) => (
                    <LevelRow key={summary.level} summary={summary} />
                  ))}
                </ul>
                <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                  As barras mostram quantos termos a plataforma já oferece em relação à meta acumulada de cada nível — não o seu
                  domínio pessoal. {levels.data.note}
                </p>
              </>
            ) : null}
          </section>

          {!levels.loading && totalDue > 0 && (
            <div className="flex justify-center">
              <Link to="/revisao">
                <Button size="lg">Começar a revisão de hoje</Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
