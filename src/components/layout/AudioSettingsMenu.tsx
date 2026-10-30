import { Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RATE_OPTIONS, useSettings } from '../../context/SettingsContext'
import type { VoiceName } from '../../types/api'

const VOICES: { value: VoiceName; label: string }[] = [
  { value: 'female', label: 'Feminina (Xiaoxiao)' },
  { value: 'male', label: 'Masculina (Yunxi)' },
]

/** Header popover with the audio preferences shared by every audio button in the app. */
export function AudioSettingsMenu() {
  const { settings, update } = useSettings()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Configurações de áudio"
        title="Configurações de áudio"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Volume2 className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div
          role="group"
          aria-label="Preferências de áudio"
          className="absolute right-0 top-11 z-40 w-72 animate-pop-in space-y-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Voz</legend>
            {VOICES.map((voice) => (
              <label key={voice.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="voice"
                  checked={settings.voice === voice.value}
                  onChange={() => update({ voice: voice.value })}
                  className="accent-emerald-500"
                />
                {voice.label}
              </label>
            ))}
          </fieldset>

          <label className="block space-y-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Velocidade</span>
            <select
              value={settings.rate}
              onChange={(event) => update({ rate: event.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
            >
              {RATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.autoplay}
              onChange={(event) => update({ autoplay: event.target.checked })}
              className="accent-emerald-500"
            />
            Tocar ao revelar o cartão
          </label>
        </div>
      )}
    </div>
  )
}
