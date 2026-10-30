import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsProvider } from '../context/SettingsContext'

export function renderWithProviders(ui: ReactElement, route = '/') {
  return render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>
    </SettingsProvider>,
  )
}
