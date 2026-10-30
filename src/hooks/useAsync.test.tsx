import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api'
import { useAsync } from './useAsync'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsync', () => {
  it('loads data and exposes loading state', async () => {
    const { result } = renderHook(() => useAsync(async () => 'ok', []))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBe('ok')
    expect(result.current.error).toBeNull()
  })

  it('never lets an older, slower response overwrite a newer one', async () => {
    const slow = deferred<string>()
    const fast = deferred<string>()
    const { result, rerender } = renderHook(({ query }) => useAsync(() => (query === 'a' ? slow.promise : fast.promise), [query]), {
      initialProps: { query: 'a' },
    })

    rerender({ query: 'b' })
    await act(async () => fast.resolve('resultado de b'))
    await waitFor(() => expect(result.current.data).toBe('resultado de b'))

    await act(async () => slow.resolve('resultado de a (atrasado)'))
    expect(result.current.data).toBe('resultado de b')
  })

  it('aborts the previous request when the dependencies change', async () => {
    const signals: AbortSignal[] = []
    const { rerender } = renderHook(
      ({ query }) =>
        useAsync((signal) => {
          signals.push(signal)
          return new Promise<string>(() => {})
        }, [query]),
      { initialProps: { query: 'a' } },
    )
    rerender({ query: 'b' })

    expect(signals).toHaveLength(2)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })

  it('normalises failures into ApiError and supports reload', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new ApiError('falhou', 'server', 500)).mockResolvedValueOnce('agora foi')
    const { result } = renderHook(() => useAsync(loader, []))

    await waitFor(() => expect(result.current.error?.message).toBe('falhou'))
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.data).toBe('agora foi'))
    expect(result.current.error).toBeNull()
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
