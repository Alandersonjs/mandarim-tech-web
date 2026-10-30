import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dateKey, STATS_KEY } from '../lib/studyStats'
import { ApiError, getDueCards, getHskLevels } from '../services/api'
import { makeCard } from '../test/fixtures'
import { renderWithProviders } from '../test/utils'
import { DashboardPage } from './DashboardPage'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getDueCards: vi.fn(),
  getHskLevels: vi.fn(),
}))

const levels = {
  levels: [
    { level: 'HSK1_3.0' as const, target_cumulative_words: 300, seeded_terms: 45, handwriting_required_terms: 0 },
    { level: 'HSK2_3.0' as const, target_cumulative_words: 500, seeded_terms: 3, handwriting_required_terms: 0 },
    { level: 'HSK_TECH' as const, target_cumulative_words: null, seeded_terms: 25, handwriting_required_terms: 0 },
  ],
  note: 'Metas acumuladas do HSK 3.0.',
}

function daysAgo(count: number): string {
  const date = new Date()
  date.setDate(date.getDate() - count)
  return dateKey(date)
}

beforeEach(() => {
  vi.mocked(getDueCards).mockReset()
  vi.mocked(getHskLevels).mockReset()
  vi.mocked(getDueCards).mockResolvedValue({ total_due: 68, items: [makeCard()] })
  vi.mocked(getHskLevels).mockResolvedValue(levels)
})

describe('DashboardPage', () => {
  it('shows the due cards and the HSK 3.0 coverage per level', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('68')).toBeInTheDocument()
    expect(screen.getByText('68 cartões devidos')).toBeInTheDocument()
    expect(screen.getByText('45 de 300 palavras (15%)')).toBeInTheDocument()
    expect(screen.getByText('3 de 500 palavras (1%)')).toBeInTheDocument()
    expect(screen.getByText('25 termos técnicos')).toBeInTheDocument()
    // No official target for technical vocabulary: no bar that would suggest a fake progress.
    expect(screen.queryByRole('progressbar', { name: 'Cobertura de Tech' })).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Cobertura de HSK 1' })).toHaveAttribute('aria-valuenow', '15')
    expect(screen.getByText(/não o seu domínio pessoal/)).toBeInTheDocument()
  })

  it('computes streak, today and the 30-day challenge from the local history', async () => {
    const today = daysAgo(0)
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify({
        startedAt: daysAgo(2),
        days: { [daysAgo(2)]: { reviews: 5, correct: 5 }, [daysAgo(1)]: { reviews: 4, correct: 3 }, [today]: { reviews: 10, correct: 8 } },
        reviewedTermIds: [1, 2, 3],
      }),
    )
    renderWithProviders(<DashboardPage />)
    await screen.findByText('68')

    const streak = screen.getByRole('heading', { name: 'Ofensiva' }).closest('section')!
    expect(within(streak).getByText('3')).toBeInTheDocument()
    expect(within(streak).getByText(/Mantida hoje/)).toBeInTheDocument()

    const todayCard = screen.getByRole('heading', { name: 'Hoje' }).closest('section')!
    expect(within(todayCard).getByText('10')).toBeInTheDocument()
    expect(within(todayCard).getByText('Precisão de 80%.')).toBeInTheDocument()

    expect(screen.getByRole('progressbar', { name: /desafio de 30 dias/i })).toHaveAttribute('aria-valuenow', '10')
    expect(screen.getByText(/Você já revisou/)).toHaveTextContent('3 de 73 termos')
  })

  it('invites a first-time learner to start', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('68')

    expect(screen.getByText('Faça uma revisão hoje para começar.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma revisão ainda.')).toBeInTheDocument()
    expect(screen.getByText(/O dia 1 é hoje/)).toBeInTheDocument()
  })

  it('shows a single friendly error when the backend is down, and retries both requests', async () => {
    const offline = new ApiError('Não foi possível conectar à API em http://127.0.0.1:8000.', 'network')
    vi.mocked(getDueCards).mockRejectedValueOnce(offline)
    vi.mocked(getHskLevels).mockRejectedValueOnce(offline)
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar à API')
    expect(screen.getByText('uvicorn app.main:app --reload')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(await screen.findByText('68')).toBeInTheDocument()
  })

  it('keeps the rest of the page when only the levels request fails', async () => {
    vi.mocked(getHskLevels).mockRejectedValue(new ApiError('Erro no servidor.', 'server', 500))
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('68')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro no servidor.')
  })

  it('links to the main areas', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('68')

    expect(screen.getByRole('link', { name: 'Responder Pesquisa ➔' })).toHaveAttribute(
      'href',
      'https://forms.gle/jgAye6f6sEsQ7xMZ8',
    )
    expect(screen.getByRole('link', { name: /revisar agora/i })).toHaveAttribute('href', '/revisao')
    expect(screen.getByRole('link', { name: /explorar vocabulário/i })).toHaveAttribute('href', '/vocabulario')
    expect(screen.getByRole('link', { name: /playground/i })).toHaveAttribute('href', '/playground')
  })
})
