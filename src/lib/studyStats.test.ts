import { describe, expect, it } from 'vitest'
import {
  challengeProgress,
  computeStreak,
  dateKey,
  EMPTY_STATS,
  recordReview,
  todaySummary,
  type StudyStats,
} from './studyStats'

const day = (month: number, date: number, hour = 12) => new Date(2026, month - 1, date, hour)

function withReviews(entries: Record<string, number>): StudyStats {
  return {
    startedAt: Object.keys(entries).sort()[0] ?? null,
    days: Object.fromEntries(Object.entries(entries).map(([key, reviews]) => [key, { reviews, correct: reviews }])),
    reviewedTermIds: [],
  }
}

describe('recordReview', () => {
  it('counts reviews and correct answers (grade >= 3) on the local day', () => {
    let stats = recordReview(EMPTY_STATS, 1, 5, day(10, 27))
    stats = recordReview(stats, 2, 2, day(10, 27))
    stats = recordReview(stats, 1, 3, day(10, 27))

    expect(stats.days['2026-10-27']).toEqual({ reviews: 3, correct: 2 })
    expect(stats.reviewedTermIds).toEqual([1, 2])
    expect(stats.startedAt).toBe('2026-10-27')
  })

  it('does not mutate the previous state and keeps the first start date', () => {
    const first = recordReview(EMPTY_STATS, 1, 4, day(10, 20))
    const second = recordReview(first, 1, 4, day(10, 27))
    expect(EMPTY_STATS.days).toEqual({})
    expect(first.days['2026-10-27']).toBeUndefined()
    expect(second.startedAt).toBe('2026-10-20')
  })

  it('uses the learner local date, not UTC (late-night reviews count for that day)', () => {
    expect(dateKey(new Date(2026, 9, 27, 23, 59))).toBe('2026-10-27')
    expect(dateKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })
})

describe('computeStreak', () => {
  it('is zero without reviews', () => {
    expect(computeStreak(EMPTY_STATS, day(10, 27))).toEqual({ current: 0, activeToday: false })
  })

  it('counts consecutive days including today', () => {
    const stats = withReviews({ '2026-10-25': 3, '2026-10-26': 1, '2026-10-27': 5 })
    expect(computeStreak(stats, day(10, 27))).toEqual({ current: 3, activeToday: true })
  })

  it('stays alive until the end of today when only yesterday has reviews', () => {
    const stats = withReviews({ '2026-10-25': 3, '2026-10-26': 2 })
    expect(computeStreak(stats, day(10, 27))).toEqual({ current: 2, activeToday: false })
  })

  it('breaks after a missed day', () => {
    const stats = withReviews({ '2026-10-24': 3, '2026-10-26': 2, '2026-10-27': 1 })
    expect(computeStreak(stats, day(10, 27)).current).toBe(2)
    expect(computeStreak(withReviews({ '2026-10-24': 3 }), day(10, 27)).current).toBe(0)
  })

  it('crosses month and year boundaries', () => {
    const stats = withReviews({ '2025-12-31': 1, '2026-01-01': 1, '2026-01-02': 1 })
    expect(computeStreak(stats, new Date(2026, 0, 2, 9)).current).toBe(3)
  })
})

describe('challengeProgress', () => {
  it('has not started before the first review', () => {
    expect(challengeProgress(EMPTY_STATS, day(10, 27))).toMatchObject({ started: false, day: 0, daysLeft: 30 })
  })

  it('day 1 is the first review day', () => {
    const stats = withReviews({ '2026-10-27': 1 })
    expect(challengeProgress(stats, day(10, 27))).toMatchObject({ day: 1, daysLeft: 29, finished: false })
    expect(challengeProgress(stats, day(11, 5))).toMatchObject({ day: 10, daysLeft: 20 })
  })

  it('caps at 30 and reports completion', () => {
    const stats = withReviews({ '2026-10-01': 1 })
    expect(challengeProgress(stats, day(10, 30))).toMatchObject({ day: 30, finished: false })
    expect(challengeProgress(stats, day(11, 15))).toMatchObject({ day: 30, daysLeft: 0, finished: true })
  })
})

describe('todaySummary', () => {
  it('has no accuracy before the first review', () => {
    expect(todaySummary(EMPTY_STATS, day(10, 27))).toEqual({ reviews: 0, correct: 0, accuracy: null })
  })

  it('rounds the accuracy', () => {
    const stats: StudyStats = { ...EMPTY_STATS, days: { '2026-10-27': { reviews: 3, correct: 2 } } }
    expect(todaySummary(stats, day(10, 27)).accuracy).toBe(67)
  })
})
