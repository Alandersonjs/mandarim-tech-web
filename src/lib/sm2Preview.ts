/**
 * Client-side preview of the backend's SM-2 step, used ONLY to show "next review in N days"
 * on the grade buttons. The real schedule always comes from `POST /api/srs/review`.
 * Mirrors app/services/srs_service.py (lapses keep the ease factor; .5 rounds up).
 */
import type { Grade, SRSCard } from '../types/api'

const MIN_EASE_FACTOR = 1.3

export interface SM2Step {
  interval: number
  repetition: number
  easeFactor: number
}

export function previewSm2(card: Pick<SRSCard, 'interval' | 'repetition' | 'ease_factor'>, grade: Grade): SM2Step {
  if (grade < 3) return { interval: 1, repetition: 0, easeFactor: card.ease_factor }

  let interval: number
  if (card.repetition === 0) interval = 1
  else if (card.repetition === 1) interval = 6
  else interval = Math.max(1, Math.floor(card.interval * card.ease_factor + 0.5))

  const distance = 5 - grade
  const ease = card.ease_factor + (0.1 - distance * (0.08 + distance * 0.02))
  return {
    interval,
    repetition: card.repetition + 1,
    easeFactor: Math.max(MIN_EASE_FACTOR, Math.round(ease * 100) / 100),
  }
}
