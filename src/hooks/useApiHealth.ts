import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'

export type ApiHealth = 'checking' | 'online' | 'offline'

/** Pings GET /health every `intervalMs` so the UI can show whether the backend is reachable. */
export function useApiHealth(intervalMs = 30_000): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>('checking')

  useEffect(() => {
    let cancelled = false
    const check = () => {
      getHealth()
        .then(() => !cancelled && setHealth('online'))
        .catch(() => !cancelled && setHealth('offline'))
    }
    check()
    const timer = setInterval(check, intervalMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [intervalMs])

  return health
}
