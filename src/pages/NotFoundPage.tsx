import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/Feedback'

export function NotFoundPage() {
  return (
    <EmptyState title="Página não encontrada">
      <Link to="/" className="text-emerald-600 underline dark:text-emerald-300">
        Voltar ao painel
      </Link>
    </EmptyState>
  )
}
