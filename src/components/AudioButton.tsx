import { AlertCircle, Loader2, Volume2 } from 'lucide-react'
import { forwardRef, useImperativeHandle } from 'react'
import { useSpeech } from '../hooks/useSpeech'

export interface AudioButtonHandle {
  play: () => void
}

interface AudioButtonProps {
  /** Mandarin text (must contain Hanzi) sent to the TTS endpoint. */
  text: string
  label?: string
  size?: 'sm' | 'lg'
  className?: string
}

/** Speaker button: loads the neural audio from the API, plays it and shows loading/error state. */
export const AudioButton = forwardRef<AudioButtonHandle, AudioButtonProps>(function AudioButton(
  { text, label = 'Ouvir pronúncia', size = 'sm', className = '' },
  ref,
) {
  const { state, error, play } = useSpeech()
  useImperativeHandle(ref, () => ({ play: () => void play(text) }), [play, text])

  const dimensions = size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'
  const iconSize = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  const Icon = state === 'loading' ? Loader2 : state === 'error' ? AlertCircle : Volume2
  const tone =
    state === 'error'
      ? 'border-red-500/50 text-red-500'
      : state === 'playing'
        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
        : 'border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-700 dark:text-slate-300'

  return (
    <span className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => void play(text)}
        aria-label={label}
        title={label}
        disabled={state === 'loading'}
        className={`inline-flex items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-wait ${dimensions} ${tone}`}
      >
        <Icon className={`${iconSize} ${state === 'loading' ? 'animate-spin' : ''} ${state === 'playing' ? 'animate-pulse' : ''}`} aria-hidden />
      </button>
      {state === 'error' && error && (
        <span role="alert" className="max-w-[14rem] text-center text-[11px] leading-tight text-red-500">
          {error}
        </span>
      )}
    </span>
  )
})
