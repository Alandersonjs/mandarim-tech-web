import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { VocabularyTerm } from '../types/api'
import { AudioButton } from './AudioButton'
import { TermDetails } from './TermDetails'
import { CategoryBadge, HandwritingBadge, LevelBadge } from './ui/Badges'

interface Props {
  term: VocabularyTerm
  onClose: () => void
}

export function TermDetailDialog({ term, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="term-dialog-title"
        className="max-h-[92vh] w-full max-w-xl animate-pop-in overflow-y-auto rounded-t-3xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <LevelBadge level={term.hsk_level} />
              <CategoryBadge category={term.category} />
              {term.is_handwriting_required && <HandwritingBadge />}
            </div>
            <h2 id="term-dialog-title" className="flex items-center gap-3">
              <span className="font-hanzi text-5xl leading-none">{term.hanzi}</span>
              <AudioButton text={term.hanzi} size="lg" label={`Ouvir ${term.hanzi}`} />
            </h2>
            <p className="mt-2 text-lg font-medium">{term.portuguese}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <TermDetails term={term} />
      </div>
    </div>
  )
}
