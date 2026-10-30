import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { playSpeech, stopSpeech } from '../lib/audioPlayer'
import { toApiError } from '../services/api'

export type SpeechState = 'idle' | 'loading' | 'playing' | 'error'

/** Plays Mandarin text with the voice and speed chosen in the settings. */
export function useSpeech() {
  const { settings } = useSettings()
  const [state, setState] = useState<SpeechState>('idle')
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const mounted = useRef(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      audioRef.current?.pause()
    }
  }, [])

  const play = useCallback(
    async (text: string) => {
      const id = ++requestId.current
      setState('loading')
      setError(null)
      try {
        const audio = await playSpeech(text, settings.voice, settings.rate)
        if (!mounted.current || id !== requestId.current) {
          audio.pause()
          return
        }
        audioRef.current = audio
        setState('playing')
        const finish = () => {
          if (mounted.current && id === requestId.current) setState('idle')
        }
        audio.addEventListener('ended', finish)
        audio.addEventListener('pause', finish)
      } catch (caught) {
        if (!mounted.current || id !== requestId.current) return
        const apiError = await toApiError(caught)
        setError(
          caught instanceof DOMException && caught.name === 'NotAllowedError'
            ? 'O navegador bloqueou a reprodução automática. Clique no botão de áudio.'
            : apiError.message,
        )
        setState('error')
      }
    },
    [settings.voice, settings.rate],
  )

  const stop = useCallback(() => {
    requestId.current += 1
    stopSpeech()
    setState('idle')
  }, [])

  return { state, error, play, stop }
}
