import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readJson, writeJson } from '../lib/storage'
import type { VoiceName } from '../types/api'

export type Theme = 'dark' | 'light'

export interface Settings {
  theme: Theme
  voice: VoiceName
  /** Speaking rate with explicit sign, as the API requires ("-30%", "+0%"). */
  rate: string
  /** Play the Hanzi automatically when a flashcard is revealed. */
  autoplay: boolean
}

export const SETTINGS_KEY = 'mandarim.settings'

export const DEFAULT_SETTINGS: Settings = { theme: 'dark', voice: 'female', rate: '+0%', autoplay: false }

export const RATE_OPTIONS = [
  { value: '-30%', label: 'Lento (−30%)' },
  { value: '+0%', label: 'Normal' },
  { value: '+20%', label: 'Rápido (+20%)' },
] as const

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  toggleTheme: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readJson<Partial<Settings>>(SETTINGS_KEY, {}),
  }))

  useEffect(() => {
    writeJson(SETTINGS_KEY, settings)
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  }, [settings])

  const update = useCallback((patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })), [])
  const toggleTheme = useCallback(
    () => setSettings((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' })),
    [],
  )

  const value = useMemo(() => ({ settings, update, toggleTheme }), [settings, update, toggleTheme])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>.')
  return context
}
