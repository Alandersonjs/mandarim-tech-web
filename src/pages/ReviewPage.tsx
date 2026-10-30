import { CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ReviewSession } from '../components/ReviewSession'
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback'
import { useAsync } from '../hooks/useAsync'
import { getDueCards } from '../services/api'

const BATCH_SIZE = 20

export function ReviewPage() {
  // Changing `batch` loads the next slice of due cards and restarts the session.
  const [batch, setBatch] = useState(0)
  const due = useAsync((signal) => getDueCards(BATCH_SIZE, signal), [batch])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Revisão espaçada</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Revele a resposta, avalie de 0 a 5 e o algoritmo SM-2 agenda a próxima revisão.
        </p>
      </header>

      {due.loading ? (
        <Spinner label="Buscando cartões devidos…" />
      ) : due.error ? (
        <ErrorState error={due.error} onRetry={due.reload} />
      ) : !due.data || due.data.items.length === 0 ? (
        <EmptyState title="Nenhum cartão para revisar agora">
          <CheckCheck className="mx-auto mb-2 h-6 w-6 text-emerald-500" aria-hidden />
          Você está em dia! Explore o{' '}
          <Link to="/vocabulario" className="text-emerald-600 underline dark:text-emerald-300">
            vocabulário
          </Link>{' '}
          ou volte mais tarde.
        </EmptyState>
      ) : (
        <ReviewSession
          key={batch}
          cards={due.data.items}
          totalDue={due.data.total_due}
          onLoadMore={() => setBatch((current) => current + 1)}
        />
      )}
    </div>
  )
}
