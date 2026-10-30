import { BookOpen, Code2, LayoutDashboard, Layers, Moon, Sun, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext'
import { useApiHealth, type ApiHealth } from '../../hooks/useApiHealth'
import { AudioSettingsMenu } from './AudioSettingsMenu'

interface NavItem {
  to: string
  label: string
  short: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Painel', short: 'Painel', icon: LayoutDashboard },
  { to: '/revisao', label: 'Revisão (SRS)', short: 'Revisão', icon: Layers },
  { to: '/vocabulario', label: 'Vocabulário & HSK', short: 'Vocabulário', icon: BookOpen },
  { to: '/playground', label: 'Playground S-T-L-V-O', short: 'Playground', icon: Code2 },
]

const HEALTH_UI: Record<ApiHealth, { label: string; dot: string }> = {
  checking: { label: 'Verificando API…', dot: 'bg-slate-400 animate-pulse' },
  online: { label: 'API online', dot: 'bg-emerald-500' },
  offline: { label: 'API offline', dot: 'bg-red-500' },
}

function ApiStatusPill() {
  const health = useApiHealth()
  const ui = HEALTH_UI[health]
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-300 px-2.5 py-1 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300"
    >
      <span className={`h-2 w-2 rounded-full ${ui.dot}`} aria-hidden />
      {/* Compact on phones: the coloured dot is enough there; the text stays for screen readers. */}
      <span className="sr-only sm:not-sr-only">{ui.label}</span>
    </span>
  )
}

function ThemeToggle() {
  const { settings, toggleTheme } = useSettings()
  const dark = settings.theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 font-hanzi text-xl font-bold text-slate-950">
        中
      </span>
      <span className="font-mono text-sm font-semibold leading-tight">
        mandarim<span className="text-emerald-500">.tech</span>
        <span className="block text-[10px] font-normal text-slate-500">HSK 3.0 para devs</span>
      </span>
    </div>
  )
}

export function AppShell() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r border-slate-200 bg-white/60 p-5 dark:border-slate-800 dark:bg-slate-950/40 md:flex">
        <Logo />
        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto text-[11px] leading-relaxed text-slate-500">
          Dica: revise todo dia. A ofensiva é o seu cron job do aprendizado.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-[#0b1020]/80 md:px-8">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1.5">
            <ApiStatusPill />
            <AudioSettingsMenu />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegação principal (celular)"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden"
      >
        {NAV_ITEMS.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500'
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
