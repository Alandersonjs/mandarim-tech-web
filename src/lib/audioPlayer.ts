/**
 * Neural TTS playback. Audio is downloaded as a Blob (so API errors can be displayed),
 * kept in memory as an object URL and played with an <audio> element. Only one audio
 * plays at a time across the whole app.
 */
import { fetchTtsAudio } from '../services/api'
import type { VoiceName } from '../types/api'

const urlCache = new Map<string, string>()
let current: HTMLAudioElement | null = null

export function stopSpeech(): void {
  current?.pause()
  current = null
}

export function clearSpeechCache(): void {
  urlCache.forEach((url) => URL.revokeObjectURL(url))
  urlCache.clear()
}

async function loadSpeechUrl(text: string, voice: VoiceName, rate: string, signal?: AbortSignal): Promise<string> {
  const key = `${voice}|${rate}|${text}`
  const cached = urlCache.get(key)
  if (cached) return cached

  const blob = await fetchTtsAudio(text, voice, rate, signal)
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

/**
 * Stops any current audio, fetches (or reuses) the MP3 and starts playing it.
 * Resolves with the <audio> element once playback has started.
 */
export async function playSpeech(text: string, voice: VoiceName, rate: string, signal?: AbortSignal): Promise<HTMLAudioElement> {
  stopSpeech()
  const url = await loadSpeechUrl(text, voice, rate, signal)
  const audio = new Audio(url)
  current = audio
  await audio.play()
  return audio
}
