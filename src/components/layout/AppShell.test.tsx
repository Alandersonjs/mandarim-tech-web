import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTINGS_KEY } from '../../context/SettingsContext'
import { ApiError, getHealth } from '../../services/api'
import { renderWithProviders } from '../../test/utils'
import { AppShell } from './AppShell'

vi.mock('../../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/api')>()),
  getHealth: vi.fn(),
}))

function renderShell(route = '/revisao') {
  return renderWithProviders(
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<p>página inicial</p>} />
        <Route path="revisao" element={<p>página de revisão</p>} />
      </Route>
    </Routes>,
    route,
  )
}

beforeEach(() => {
  vi.mocked(getHealth).mockReset()
  vi.mocked(getHealth).mockResolvedValue({ status: 'ok' })
  document.documentElement.classList.add('dark')
})

describe('AppShell', () => {
  it('has the four sections in both navigations and renders the routed page', async () => {
    renderShell()
    expect(await screen.findByText('página de revisão')).toBeInTheDocument()

    for (const name of ['Navegação principal', 'Navegação principal (celular)']) {
      const nav = screen.getByRole('navigation', { name })
      expect(within(nav).getAllByRole('link')).toHaveLength(4)
    }
    const desktop = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(within(desktop).getByRole('link', { name: /revisão \(srs\)/i })).toHaveAttribute('aria-current', 'page')
    expect(within(desktop).getByRole('link', { name: 'Painel' })).not.toHaveAttribute('aria-current')
  })

  it('shows whether the API is reachable', async () => {
    renderShell()
    expect(await screen.findByText('API online')).toBeInTheDocument()
  })

  it('links to the survey in a safe new tab', () => {
    renderShell()
    expect(screen.getByRole('link', { name: 'Responder Pesquisa ➔' })).toHaveAttribute(
      'href',
      'https://forms.gle/jgAye6f6sEsQ7xMZ8',
    )
    expect(screen.getByRole('link', { name: 'Responder Pesquisa ➔' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'Responder Pesquisa ➔' })).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows "API offline" when the health check fails', async () => {
    vi.mocked(getHealth).mockRejectedValue(new ApiError('sem conexão', 'network'))
    renderShell()
    expect(await screen.findByText('API offline')).toBeInTheDocument()
  })

  it('toggles and persists the theme (dark by default)', async () => {
    const user = userEvent.setup()
    renderShell()
    expect(document.documentElement).toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: 'Mudar para o tema claro' }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).theme).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Mudar para o tema escuro' }))
    expect(document.documentElement).toHaveClass('dark')
  })

  it('saves the audio preferences and closes the menu with Esc', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Configurações de áudio' }))

    const menu = screen.getByRole('group', { name: 'Preferências de áudio' })
    await user.click(within(menu).getByRole('radio', { name: /masculina/i }))
    await user.selectOptions(within(menu).getByRole('combobox'), '-30%')
    await user.click(within(menu).getByRole('checkbox', { name: /tocar ao revelar/i }))

    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({ voice: 'male', rate: '-30%', autoplay: true })

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Preferências de áudio' })).not.toBeInTheDocument())
  })
})
