/**
 * Learner statistics kept in the browser.
 *
 * The backend has no accounts nor a streak endpoint, so streak, daily goal and the
 * 30-day challenge are derived from the reviews sent by THIS browser. All the logic
 * is pure (state in, state out) and takes the current date as a parameter.
 */
import type { Grade } from '../types/api'
import { readJson, writeJson } from './storage'

export const STATS_KEY = 'mandarim.stats'
export const CHALLENGE_DAYS = 30
export const PASSING_GRADE = 3
const MAX_TRACKED_DAYS = 400

export interface DayStats {
  reviews: number
  correct: number
}

export interface StudyStats {
  /** Local date (YYYY-MM-DD) of the first review: day 1 of the 30-day challenge. */
  startedAt: string | null
  days: Record<string, DayStats>
  reviewedTermIds: number[]
}

export const EMPTY_STATS: StudyStats = { startedAt: null, days: {}, reviewedTermIds: [] }

/** Local calendar date as YYYY-MM-DD (the learner's "day", not the UTC day). */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function previousDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
}

export function loadStats(): StudyStats {
  const stored = readJson<Partial<StudyStats>>(STATS_KEY, {})
  return {
    startedAt: stored.startedAt ?? null,
    days: stored.days ?? {},
    reviewedTermIds: stored.reviewedTermIds ?? [],
  }
}

export function saveStats(stats: StudyStats): void {
  writeJson(STATS_KEY, stats)
}

/** Registers one review (pure). Grades >= 3 count as correct. */
export function recordReview(stats: StudyStats, termId: number, grade: Grade, now: Date): StudyStats {
  const key = dateKey(now)
  const today = stats.days[key] ?? { reviews: 0, correct: 0 }
  const days = {
    ...stats.days,
    [key]: { reviews: today.reviews + 1, correct: today.correct + (grade >= PASSING_GRADE ? 1 : 0) },
  }

  const keptKeys = Object.keys(days).sort().slice(-MAX_TRACKED_DAYS)
  const trimmed: Record<string, DayStats> = {}
  for (const k of keptKeys) trimmed[k] = days[k]

  return {
    startedAt: stats.startedAt ?? key,
    days: trimmed,
    reviewedTermIds: stats.reviewedTermIds.includes(termId) ? stats.reviewedTermIds : [...stats.reviewedTermIds, termId],
  }
}

export interface Streak {
  /** Consecutive days with at least one review. */
  current: number
  /** False when the streak is alive only because of yesterday: review today to keep it. */
  activeToday: boolean
}

export function computeStreak(stats: StudyStats, now: Date): Streak {
  const hasReviews = (date: Date) => (stats.days[dateKey(date)]?.reviews ?? 0) > 0

  const activeToday = hasReviews(now)
  let cursor = activeToday ? now : previousDay(now)
  let current = 0
  while (hasReviews(cursor)) {
    current += 1
    cursor = previousDay(cursor)
  }
  return { current, activeToday }
}

export interface Challenge {
  /** Current day of the challenge (1-30). */
  day: number
  totalDays: number
  daysLeft: number
  finished: boolean
  started: boolean
}

export function challengeProgress(stats: StudyStats, now: Date, totalDays = CHALLENGE_DAYS): Challenge {
  if (!stats.startedAt) return { day: 0, totalDays, daysLeft: totalDays, finished: false, started: false }

  const start = parseKey(stats.startedAt)
  const today = parseKey(dateKey(now))
  const elapsed = Math.round((today.getTime() - start.getTime()) / 86_400_000)
  const day = Math.min(totalDays, Math.max(1, elapsed + 1))
  return { day, totalDays, daysLeft: totalDays - day, finished: elapsed + 1 > totalDays, started: true }
}

export interface TodaySummary {
  reviews: number
  correct: number
  /** 0-100, or null before the first review of the day. */
  accuracy: number | null
}

export function todaySummary(stats: StudyStats, now: Date): TodaySummary {
  const today = stats.days[dateKey(now)] ?? { reviews: 0, correct: 0 }
  return {
    reviews: today.reviews,
    correct: today.correct,
    accuracy: today.reviews === 0 ? null : Math.round((today.correct / today.reviews) * 100),
  }
}
