import { AlertTriangle, Inbox, Loader2, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ApiError } from '../../services/api'
import { Button } from './Button'

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  const offline = 'kind' in error && (error.kind === 'network' || error.kind === 'timeout')
  const Icon = offline ? WifiOff : AlertTriangle
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center"
    >
      <Icon className="h-8 w-8 text-red-500" aria-hidden />
      <p className="text-sm font-medium text-red-700 dark:text-red-300">{error.message}</p>
      {offline && (
        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
          uvicorn app.main:app --reload
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-12 text-center">
      <Inbox className="h-9 w-9 text-slate-400" aria-hidden />
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <div className="text-sm text-slate-500 dark:text-slate-400">{children}</div>}
    </div>
  )
}
