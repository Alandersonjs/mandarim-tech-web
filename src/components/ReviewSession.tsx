import { ArrowRight, CheckCircle2, Eye, PartyPopper, RotateCcw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import { describeInterval, pluralize } from '../lib/format'
import { GRADES, gradeMeta } from '../lib/grades'
import { previewSm2 } from '../lib/sm2Preview'
import { loadStats, PASSING_GRADE, recordReview, saveStats } from '../lib/studyStats'
import { submitReview } from '../services/api'
import type { Grade, SRSCard } from '../types/api'
import { AudioButton, type AudioButtonHandle } from './AudioButton'
import { TermDetails } from './TermDetails'
import { Button } from './ui/Button'
import { CategoryBadge, HandwritingBadge, LevelBadge } from './ui/Badges'

interface Props {
  cards: SRSCard[]
  /** Total number of due cards on the server (may be larger than `cards.length`). */
  totalDue: number
  onLoadMore: () => void
  /** How long the result banner stays before moving on automatically. */
  autoAdvanceMs?: number
}

interface Feedback {
  grade: Grade
  updated: SRSCard
}

export function ReviewSession({ cards, totalDue, onLoadMore, autoAdvanceMs = 1300 }: Props) {
  const { settings } = useSettings()
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [results, setResults] = useState<Grade[]>([])
  const frontAudio = useRef<AudioButtonHandle>(null)

  const finished = index >= cards.length
  const card = finished ? null : cards[index]

  const reveal = useCallback(() => {
    setRevealed(true)
    if (settings.autoplay) frontAudio.current?.play()
  }, [settings.autoplay])

  const advance = useCallback(() => {
    setIndex((current) => current + 1)
    setRevealed(false)
    setFeedback(null)
    setSubmitError(null)
  }, [])

  const grade = useCallback(
    async (value: Grade) => {
      if (!card || !revealed || submitting || feedback) return
      setSubmitting(true)
      setSubmitError(null)
      try {
        const updated = await submitReview(card.term.id, value)
        saveStats(recordReview(loadStats(), card.term.id, value, new Date()))
        setResults((current) => [...current, value])
        setFeedback({ grade: value, updated })
      } catch (caught) {
        setSubmitError(caught instanceof Error ? caught.message : 'Não foi possível enviar a avaliação.')
      } finally {
        setSubmitting(false)
      }
    },
    [card, revealed, submitting, feedback],
  )

  // Move on by itself after the feedback banner has been visible for a moment.
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(advance, autoAdvanceMs)
    return () => clearTimeout(timer)
  }, [feedback, advance, autoAdvanceMs])

  // Keyboard: Space/Enter reveal or continue, 0-5 grade, P plays the audio.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || finished) return
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const confirmKey = event.key === ' ' || event.key === 'Enter'
      // Defensive: a focused button already reacts to Space/Enter by itself. (In Chromium the result is
      // the same with or without this line; it is kept for engines that fire the click on keydown.)
      if (confirmKey && target.tagName === 'BUTTON') return

      if (event.key.toLowerCase() === 'p') frontAudio.current?.play()
      else if (feedback) {
        if (confirmKey) {
          event.preventDefault()
          advance()
        }
      } else if (!revealed) {
        if (confirmKey) {
          event.preventDefault()
          reveal()
        }
      } else if (/^[0-5]$/.test(event.key)) {
        void grade(Number(event.key) as Grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, feedback, revealed, reveal, advance, grade])

  if (finished || !card) {
    return <SessionSummary results={results} remaining={Math.max(0, totalDue - cards.length)} onLoadMore={onLoadMore} />
  }

  const { term } = card
  const isNew = card.repetition === 0 && card.interval === 0
  const progress = Math.round((index / cards.length) * 100)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Cartão {index + 1} de {cards.length}
          </span>
          <span>{pluralize(totalDue, 'cartão devido', 'cartões devidos')} no total</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da sessão"
        >
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article
        key={card.id}
        className="animate-slide-up rounded-3xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:p-8"
      >
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <LevelBadge level={term.hsk_level} />
          <CategoryBadge category={term.category} />
          {term.is_handwriting_required && <HandwritingBadge />}
          <span className="ml-auto font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {isNew ? 'novo' : `intervalo ${describeInterval(card.interval)} · EF ${card.ease_factor.toFixed(2)}`}
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-hanzi text-7xl leading-tight sm:text-8xl" lang="zh-CN">
            {term.hanzi}
          </p>
          <AudioButton ref={frontAudio} text={term.hanzi} size="lg" label={`Ouvir ${term.hanzi}`} />
          {!revealed && <p className="text-sm text-slate-500 dark:text-slate-400">Qual é o significado e a pronúncia?</p>}
        </div>

        {revealed && (
          <div className="mt-6 animate-slide-up space-y-5 border-t border-slate-200 pt-6 dark:border-slate-800">
            <p className="text-center text-2xl font-semibold">{term.portuguese}</p>
            <TermDetails term={term} />
          </div>
        )}
      </article>

      {/* Sticky action bar: the answer controls stay on screen however long the revealed card is. */}
      <div className="sticky bottom-[4.75rem] z-20 rounded-2xl bg-slate-50/90 p-1.5 backdrop-blur dark:bg-[#0b1020]/90 md:bottom-3">
        {feedback ? (
          <FeedbackBanner feedback={feedback} onContinue={advance} />
        ) : !revealed ? (
          <Button size="lg" className="w-full" onClick={reveal}>
            <Eye className="h-5 w-5" aria-hidden />
            Mostrar resposta
            <kbd className="ml-1 hidden rounded bg-slate-950/20 px-1.5 py-0.5 font-mono text-[10px] sm:inline">Espaço</kbd>
          </Button>
        ) : (
          <div className="space-y-1.5">
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">Como foi? (teclas 0 a 5)</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
              {GRADES.map((meta) => (
                <button
                  key={meta.grade}
                  type="button"
                  disabled={submitting}
                  onClick={() => void grade(meta.grade)}
                  title={meta.hint}
                  aria-label={`${meta.grade} – ${meta.label}`}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border bg-white/80 px-1.5 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-wait disabled:opacity-60 dark:bg-slate-900/80 sm:py-3 ${meta.classes}`}
                >
                  <span className="font-mono text-base font-bold leading-none sm:text-lg">{meta.grade}</span>
                  <span className="text-xs font-semibold">{meta.label}</span>
                  <span className="font-mono text-[10px] opacity-70">≈ {describeInterval(previewSm2(card, meta.grade).interval)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {submitError && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {submitError} Sua nota não foi salva — escolha a nota novamente para tentar de novo.
        </p>
      )}

      <p className="hidden text-center text-[11px] text-slate-400 sm:block">
        Atalhos: <kbd className="font-mono">Espaço</kbd> revelar · <kbd className="font-mono">0–5</kbd> avaliar ·{' '}
        <kbd className="font-mono">P</kbd> ouvir
      </p>
    </div>
  )
}

function FeedbackBanner({ feedback, onContinue }: { feedback: Feedback; onContinue: () => void }) {
  const passed = feedback.grade >= PASSING_GRADE
  const Icon = passed ? CheckCircle2 : XCircle
  const { label } = gradeMeta(feedback.grade)
  return (
    <div
      role="status"
      className={`flex animate-pop-in items-center gap-3 rounded-2xl border p-4 ${
        passed
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
      }`}
    >
      <Icon className="h-7 w-7 shrink-0" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-semibold">
          {label}! {passed ? 'Sequência mantida.' : 'O cartão foi reiniciado.'}
        </p>
        <p className="opacity-80">
          Próxima revisão em {describeInterval(feedback.updated.interval)} · EF {feedback.updated.ease_factor.toFixed(2)}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onContinue}>
        Próximo <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  )
}

function SessionSummary({ results, remaining, onLoadMore }: { results: Grade[]; remaining: number; onLoadMore: () => void }) {
  const correct = results.filter((value) => value >= PASSING_GRADE).length
  const accuracy = results.length === 0 ? 0 : Math.round((correct / results.length) * 100)

  return (
    <div className="mx-auto w-full max-w-xl animate-pop-in space-y-6 rounded-3xl border border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
      <PartyPopper className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
      <div>
        <h2 className="text-2xl font-bold">Sessão concluída!</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {pluralize(results.length, 'cartão revisado', 'cartões revisados')}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-3">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Acertos</dt>
          <dd className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">{correct}</dd>
        </div>
        <div className="rounded-xl bg-red-500/10 p-3">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Erros</dt>
          <dd className="text-2xl font-bold text-red-600 dark:text-red-300">{results.length - correct}</dd>
        </div>
        <div className="rounded-xl bg-sky-500/10 p-3">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Precisão</dt>
          <dd className="text-2xl font-bold text-sky-600 dark:text-sky-300">{accuracy}%</dd>
        </div>
      </dl>
      {remaining > 0 ? (
        <Button size="lg" className="w-full" onClick={onLoadMore}>
          <RotateCcw className="h-5 w-5" aria-hidden />
          Revisar mais ({pluralize(remaining, 'cartão devido', 'cartões devidos')})
        </Button>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">Tudo em dia! Volte amanhã para manter a ofensiva.</p>
      )}
      <Link to="/" className="inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-300">
        Voltar ao painel
      </Link>
    </div>
  )
}
