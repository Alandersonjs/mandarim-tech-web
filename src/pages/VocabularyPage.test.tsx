import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, searchVocabulary } from '../services/api'
import { makeList, makeTerm } from '../test/fixtures'
import { renderWithProviders } from '../test/utils'
import { VocabularyPage } from './VocabularyPage'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  searchVocabulary: vi.fn(),
}))

const terms = [
  makeTerm({ id: 1, hanzi: '数据库', portuguese: 'Banco de dados', pinyin: 'shùjùkù' }),
  makeTerm({ id: 2, hanzi: '电脑', portuguese: 'Computador', pinyin: 'diànnǎo', hsk_level: 'HSK1_3.0', radical_breakdown: ['电 (eletricidade)', '脑 (cérebro · radical 月 = carne/órgão)'] }),
]

function lastQuery() {
  const calls = vi.mocked(searchVocabulary).mock.calls
  return calls[calls.length - 1][0]
}

beforeEach(() => {
  vi.mocked(searchVocabulary).mockReset()
  vi.mocked(searchVocabulary).mockResolvedValue(makeList(terms))
})

describe('VocabularyPage', () => {
  it('loads the first page and lists the terms', async () => {
    renderWithProviders(<VocabularyPage />)

    expect(await screen.findByText('Banco de dados')).toBeInTheDocument()
    expect(screen.getByText('Computador')).toBeInTheDocument()
    expect(screen.getByText('2 termos encontrados')).toBeInTheDocument()
    expect(vi.mocked(searchVocabulary).mock.calls[0][0]).toMatchObject({ search: '', page: 1, page_size: 12 })
  })

  it('searches while typing, debounced, with Pinyin without tones', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VocabularyPage />)
    await screen.findByText('Banco de dados')

    await user.type(screen.getByRole('searchbox', { name: /buscar vocabulário/i }), 'shuju')

    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'shuju', page: 1 }))
    const searches = vi.mocked(searchVocabulary).mock.calls.map(([query]) => query.search)
    expect(searches).not.toContain('shu') // intermediate keystrokes were debounced away
  })

  it('filters by category and by level', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VocabularyPage />)
    await screen.findByText('Banco de dados')

    const chip = screen.getByRole('button', { name: 'IA' })
    await user.click(chip)
    await waitFor(() => expect(lastQuery()).toMatchObject({ category: 'Artificial Intelligence' }))
    expect(chip).toHaveAttribute('aria-pressed', 'true')

    await user.selectOptions(screen.getByLabelText('Filtrar por nível HSK'), 'Tech')
    await waitFor(() => expect(lastQuery()).toMatchObject({ category: 'Artificial Intelligence', hsk_level: 'HSK_TECH' }))

    await user.click(screen.getByRole('button', { name: 'Todas' }))
    await waitFor(() => expect(lastQuery().category).toBeUndefined())
  })

  it('paginates and returns to page 1 when a filter changes', async () => {
    vi.mocked(searchVocabulary).mockResolvedValue(makeList(terms, { total: 30, total_pages: 3 }))
    const user = userEvent.setup()
    renderWithProviders(<VocabularyPage />)
    await screen.findByText('Banco de dados')

    const pager = screen.getByRole('navigation', { name: 'Paginação' })
    expect(within(pager).getByRole('button', { name: /anterior/i })).toBeDisabled()

    await user.click(within(pager).getByRole('button', { name: /próxima/i }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }))

    await user.click(screen.getByRole('button', { name: 'ERP' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ category: 'ERP', page: 1 }))
  })

  it('shows an empty state and clears the filters from it', async () => {
    vi.mocked(searchVocabulary).mockResolvedValue(makeList([]))
    const user = userEvent.setup()
    renderWithProviders(<VocabularyPage />)
    await user.click(await screen.findByRole('button', { name: 'ERP' }))

    expect(await screen.findByText('Nenhum termo encontrado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /limpe os filtros/i }))
    await waitFor(() => expect(lastQuery().category).toBeUndefined())
  })

  it('shows a friendly error with a retry button', async () => {
    vi.mocked(searchVocabulary).mockRejectedValueOnce(new ApiError('Não foi possível conectar à API em http://127.0.0.1:8000.', 'network'))
    const user = userEvent.setup()
    renderWithProviders(<VocabularyPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar à API')
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(await screen.findByText('Banco de dados')).toBeInTheDocument()
  })

  it('opens the details dialog with the radical blocks and closes with Esc', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VocabularyPage />)
    await user.click(await screen.findByRole('button', { name: /ver detalhes de 电脑/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Computador')).toBeInTheDocument()
    expect(within(dialog).getByText('shu4ju4ku4')).toBeInTheDocument()
    const blocks = within(dialog).getByRole('list', { name: /blocos semânticos/i })
    expect(within(blocks).getAllByRole('listitem')).toHaveLength(2)
    expect(within(blocks).getByText('cérebro')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
