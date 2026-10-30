import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, compileSentence } from '../services/api'
import { makeCompileResponse } from '../test/fixtures'
import { renderWithProviders } from '../test/utils'
import { PlaygroundPage } from './PlaygroundPage'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  compileSentence: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(compileSentence).mockReset()
  vi.mocked(compileSentence).mockResolvedValue(makeCompileResponse())
})

describe('PlaygroundPage', () => {
  it('starts with a ready-made IT sentence and compiles it with the API field names', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlaygroundPage />)

    expect(screen.getByLabelText('Sujeito (S)')).toHaveValue('wo')
    await user.click(screen.getByRole('button', { name: /compilar frase/i }))

    expect(compileSentence).toHaveBeenCalledWith({
      subject: 'wo',
      time: 'zuotian',
      place: '',
      verb: 'xiufu',
      object: 'bug',
      completed: true,
      le_position: 'sentence_end',
      target_level: undefined,
    })
  })

  it('renders coloured blocks, the sentence, tone syllables and the checklist', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlaygroundPage />)
    await user.click(screen.getByRole('button', { name: /compilar frase/i }))

    expect(await screen.findByText('Estrutura válida')).toBeInTheDocument()
    expect(screen.getByText('Conforme tarefa HSK')).toBeInTheDocument()
    expect(screen.getByText('S + T + V + O + 了')).toBeInTheDocument()

    const blocks = within(screen.getByRole('list', { name: 'Blocos sintáticos' })).getAllByRole('listitem')
    expect(blocks).toHaveLength(5)
    expect(blocks[0]).toHaveTextContent('S · Sujeito')
    expect(blocks[0]).toHaveTextContent('我')
    expect(blocks[2]).toHaveTextContent('V · Verbo')
    expect(blocks[3]).toHaveTextContent('Termo não chinês mantido')

    expect(screen.getByText('我昨天修复bug了。')).toBeInTheDocument()
    expect(screen.getByText('Wo3 zuo2tian1 xiu1fu4 bug le0')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: /sílabas/i })).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText(/Vocabulário:/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ouvir a frase' })).toBeInTheDocument()
  })

  it('flags an invalid structure', async () => {
    vi.mocked(compileSentence).mockResolvedValue(
      makeCompileResponse({
        structure_valid: false,
        hsk_task_check: { ...makeCompileResponse().hsk_task_check, conforms: false },
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<PlaygroundPage />)
    await user.click(screen.getByRole('button', { name: /compilar frase/i }))

    expect(await screen.findByText('Estrutura com erros')).toBeInTheDocument()
    expect(screen.getByText('Não conforme')).toBeInTheDocument()
  })

  it('fills the fields from a preset, including the 了 checkbox', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlaygroundPage />)

    await user.selectOptions(screen.getByLabelText('Selecionar frase de exemplo'), 'error')

    expect(screen.getByLabelText('Sujeito (S)')).toHaveValue('我')
    expect(screen.getByLabelText('Tempo (T)')).toHaveValue('明天')
    expect(screen.getByLabelText('Local (L)')).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: /ação concluída/i })).toBeChecked()
  })

  it('sends the target level and the 了 position when chosen', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlaygroundPage />)

    await user.selectOptions(screen.getByLabelText('Selecionar frase de exemplo'), 'level')
    await user.click(screen.getByRole('button', { name: /compilar frase/i }))
    expect(compileSentence).toHaveBeenLastCalledWith(expect.objectContaining({ verb: '写', object: '程序', target_level: 'HSK1_3.0' }))

    await user.selectOptions(screen.getByLabelText('Selecionar frase de exemplo'), 'bugfix')
    await user.selectOptions(screen.getByDisplayValue('Fim da frase'), 'after_verb')
    await user.click(screen.getByRole('button', { name: /compilar frase/i }))
    expect(compileSentence).toHaveBeenLastCalledWith(expect.objectContaining({ le_position: 'after_verb' }))
  })

  it('shows the API validation message', async () => {
    vi.mocked(compileSentence).mockRejectedValue(new ApiError('Dados inválidos.', 'validation', 422))
    const user = userEvent.setup()
    renderWithProviders(<PlaygroundPage />)
    await user.click(screen.getByRole('button', { name: /compilar frase/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Dados inválidos.')
    expect(screen.queryByText('Estrutura válida')).not.toBeInTheDocument()
  })

  it('cannot compile an empty form and "Limpar" resets everything', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlaygroundPage />)
    await user.click(screen.getByRole('button', { name: /compilar frase/i }))
    await screen.findByText('Estrutura válida')

    await user.click(screen.getByRole('button', { name: /limpar/i }))

    expect(screen.getByLabelText('Sujeito (S)')).toHaveValue('')
    expect(screen.getByRole('button', { name: /compilar frase/i })).toBeDisabled()
    expect(screen.queryByText('Estrutura válida')).not.toBeInTheDocument()
    expect(compileSentence).toHaveBeenCalledTimes(1)
  })

  it('accepts typed pieces', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlaygroundPage />)
    await user.click(screen.getByRole('button', { name: /limpar/i }))
    await user.type(screen.getByLabelText('Sujeito (S)'), '我')
    await user.type(screen.getByLabelText('Verbo (V)'), 'xiefu')
    await user.click(screen.getByRole('button', { name: /compilar frase/i }))

    expect(compileSentence).toHaveBeenCalledWith(expect.objectContaining({ subject: '我', verb: 'xiefu', completed: false }))
  })
})
