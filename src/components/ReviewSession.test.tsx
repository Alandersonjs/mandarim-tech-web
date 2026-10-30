import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { playSpeech } from '../lib/audioPlayer'
import { SETTINGS_KEY } from '../context/SettingsContext'
import { STATS_KEY } from '../lib/studyStats'
import { ApiError, submitReview } from '../services/api'
import { makeCard } from '../test/fixtures'
import { renderWithProviders } from '../test/utils'
import { ReviewSession } from './ReviewSession'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  submitReview: vi.fn(),
}))
vi.mock('../lib/audioPlayer', () => ({ playSpeech: vi.fn(), stopSpeech: vi.fn(), clearSpeechCache: vi.fn() }))

const first = makeCard({}, { id: 1, hanzi: '数据库', portuguese: 'Banco de dados' })
const second = makeCard({}, { id: 2, hanzi: '算法', portuguese: 'Algoritmo', pinyin: 'suànfǎ' })

function renderSession(props: Partial<ComponentProps<typeof ReviewSession>> = {}) {
  const onLoadMore = vi.fn()
  renderWithProviders(<ReviewSession cards={[first, second]} totalDue={5} onLoadMore={onLoadMore} autoAdvanceMs={60_000} {...props} />)
  return { onLoadMore, user: userEvent.setup() }
}

function answered(interval: number, repetition: number, ease = 2.5) {
  return makeCard({ interval, repetition, ease_factor: ease, next_review_date: '2026-10-28T12:00:00Z' }, { id: 1 })
}

beforeEach(() => {
  vi.mocked(submitReview).mockReset()
  vi.mocked(playSpeech).mockReset()
  vi.mocked(playSpeech).mockResolvedValue(document.createElement('audio'))
})

describe('flashcard flow', () => {
  it('shows only the Hanzi first and reveals the answer on demand', async () => {
    const { user } = renderSession()

    expect(screen.getByText('数据库')).toBeInTheDocument()
    expect(screen.queryByText('Banco de dados')).not.toBeInTheDocument()
    expect(screen.getByText('Cartão 1 de 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))

    expect(screen.getByText('Banco de dados')).toBeInTheDocument()
    expect(screen.getByText('shùjùkù')).toBeInTheDocument()
    expect(screen.getByText('shu4ju4ku4')).toBeInTheDocument()
    expect(screen.getByText(/chu-djü-ku/)).toBeInTheDocument()
    expect(screen.getByText('Nós usamos um banco de dados.')).toBeInTheDocument()
    for (const grade of [0, 1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: new RegExp(`^${grade} –`) })).toBeInTheDocument()
    }
  })

  it('previews the next interval on each grade button', async () => {
    const mature = makeCard({ interval: 6, repetition: 2, ease_factor: 2.5 }, { id: 1 })
    const { user } = renderSession({ cards: [mature] })
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))

    expect(screen.getByRole('button', { name: '4 – Bom' })).toHaveTextContent('≈ 15 dias')
    expect(screen.getByRole('button', { name: '1 – Errei' })).toHaveTextContent('≈ 1 dia')
  })

  it('sends the grade, shows the schedule returned by the API and moves to the next card', async () => {
    vi.mocked(submitReview).mockResolvedValue(answered(6, 2))
    const { user } = renderSession()
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))
    await user.click(screen.getByRole('button', { name: '4 – Bom' }))

    expect(submitReview).toHaveBeenCalledWith(1, 4)
    const banner = await screen.findByRole('status')
    expect(banner).toHaveTextContent('Próxima revisão em 6 dias')
    expect(banner).toHaveTextContent('Sequência mantida')

    await user.click(within(banner).getByRole('button', { name: /próximo/i }))
    expect(screen.getByText('算法')).toBeInTheDocument()
    expect(screen.getByText('Cartão 2 de 2')).toBeInTheDocument()
    expect(screen.queryByText('Algoritmo')).not.toBeInTheDocument() // the new card starts hidden again
  })

  it('tells the learner that a wrong answer restarts the card', async () => {
    vi.mocked(submitReview).mockResolvedValue(answered(1, 0))
    const { user } = renderSession()
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))
    await user.click(screen.getByRole('button', { name: '1 – Errei' }))

    expect(await screen.findByRole('status')).toHaveTextContent('O cartão foi reiniciado')
  })

  it('advances by itself after the feedback delay', async () => {
    vi.mocked(submitReview).mockResolvedValue(answered(1, 1))
    const { user } = renderSession({ autoAdvanceMs: 30 })
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))
    await user.click(screen.getByRole('button', { name: '5 – Perfeito' }))

    expect(await screen.findByText('算法')).toBeInTheDocument()
  })
})

describe('keyboard shortcuts', () => {
  it('Space reveals, a digit grades and Space continues', async () => {
    vi.mocked(submitReview).mockResolvedValue(answered(1, 1))
    const { user } = renderSession()

    await user.keyboard(' ')
    expect(screen.getByText('Banco de dados')).toBeInTheDocument()

    await user.keyboard('5')
    expect(submitReview).toHaveBeenCalledWith(1, 5)
    await screen.findByRole('status')

    await user.keyboard(' ')
    expect(screen.getByText('算法')).toBeInTheDocument()
  })

  it('ignores grade keys before the answer is revealed', async () => {
    const { user } = renderSession()
    await user.keyboard('4')
    expect(submitReview).not.toHaveBeenCalled()
  })

  it('P plays the audio', async () => {
    const { user } = renderSession()
    await user.keyboard('p')
    await waitFor(() => expect(playSpeech).toHaveBeenCalledWith('数据库', 'female', '+0%'))
  })

  it.each([[' ', 'Space'], ['{Enter}', 'Enter']])(
    'does not skip two cards when %j is pressed on the focused "Próximo" button (%s)',
    async (key) => {
      vi.mocked(submitReview).mockResolvedValue(answered(1, 1))
      const { user } = renderSession({ cards: [first, second, makeCard({}, { id: 3, hanzi: '编程' })] })
      await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))
      await user.click(screen.getByRole('button', { name: '4 – Bom' }))

      const next = within(await screen.findByRole('status')).getByRole('button', { name: /próximo/i })
      next.focus()
      await user.keyboard(key)

      expect(screen.getByText('Cartão 2 de 3')).toBeInTheDocument()
    },
  )

  it.each([[' ', 'Space'], ['{Enter}', 'Enter']])('revealing with %j on the focused button reveals exactly once (%s)', async (key) => {
    const { user } = renderSession()
    screen.getByRole('button', { name: /mostrar resposta/i }).focus()
    await user.keyboard(key)

    expect(screen.getByText('Banco de dados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4 – Bom' })).toBeInTheDocument()
  })
})

describe('audio', () => {
  it('plays automatically on reveal when the setting is on', async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ autoplay: true, voice: 'male', rate: '-30%' }))
    const { user } = renderSession()
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))

    await waitFor(() => expect(playSpeech).toHaveBeenCalledWith('数据库', 'male', '-30%'))
  })

  it('does not play on reveal by default', async () => {
    const { user } = renderSession()
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))
    expect(playSpeech).not.toHaveBeenCalled()
  })
})

describe('errors', () => {
  it('keeps the card and lets the learner retry when saving the grade fails', async () => {
    vi.mocked(submitReview)
      .mockRejectedValueOnce(new ApiError('Não foi possível conectar à API.', 'network'))
      .mockResolvedValueOnce(answered(1, 1))
    const { user } = renderSession()
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))
    await user.click(screen.getByRole('button', { name: '4 – Bom' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível conectar à API.')
    expect(alert).toHaveTextContent('não foi salva')
    expect(screen.getByText('数据库')).toBeInTheDocument() // still the same card

    await user.click(screen.getByRole('button', { name: '4 – Bom' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Próxima revisão')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not record study stats for a failed submission', async () => {
    vi.mocked(submitReview).mockRejectedValue(new ApiError('falhou', 'server', 500))
    const { user } = renderSession()
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))
    await user.click(screen.getByRole('button', { name: '3 – Difícil' }))
    await screen.findByRole('alert')

    expect(localStorage.getItem(STATS_KEY)).toBeNull()
  })
})

describe('statistics and summary', () => {
  it('records each review in the local study stats', async () => {
    vi.mocked(submitReview).mockResolvedValue(answered(1, 1))
    const { user } = renderSession()
    await user.click(screen.getByRole('button', { name: /mostrar resposta/i }))
    await user.click(screen.getByRole('button', { name: '4 – Bom' }))
    await screen.findByRole('status')

    const stats = JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}')
    expect(stats.reviewedTermIds).toEqual([1])
    expect(Object.values(stats.days)).toEqual([{ reviews: 1, correct: 1 }])
  })

  it('shows a summary and offers more cards when others are still due', async () => {
    vi.mocked(submitReview).mockResolvedValueOnce(answered(1, 1)).mockResolvedValueOnce(answered(1, 0))
    const { user, onLoadMore } = renderSession({ cards: [first, second], totalDue: 5 })

    await user.keyboard(' ')
    await user.keyboard('4')
    await user.keyboard(' ')
    await user.keyboard(' ')
    await user.keyboard('1')
    await screen.findByRole('status')
    await user.keyboard(' ')

    expect(screen.getByRole('heading', { name: 'Sessão concluída!' })).toBeInTheDocument()
    expect(screen.getByText('2 cartões revisados')).toBeInTheDocument()
    expect(screen.getByText('Acertos').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Erros').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Precisão').nextSibling).toHaveTextContent('50%')

    await user.click(screen.getByRole('button', { name: /revisar mais \(3 cartões devidos\)/i }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('says everything is done when no more cards are due', async () => {
    vi.mocked(submitReview).mockResolvedValue(answered(1, 1))
    const { user } = renderSession({ cards: [first], totalDue: 1 })
    await user.keyboard(' ')
    await user.keyboard('5')
    await screen.findByRole('status')
    await user.keyboard(' ')

    expect(screen.getByText(/tudo em dia/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /revisar mais/i })).not.toBeInTheDocument()
  })
})
