import { describe, expect, it } from 'vitest'
import type { Grade } from '../types/api'
import { previewSm2, type SM2Step } from './sm2Preview'

// Same cases as the backend test-suite (tests/test_srs.py), so both stay in sync.
function run(grades: Grade[]): SM2Step[] {
  let state: SM2Step = { interval: 0, repetition: 0, easeFactor: 2.5 }
  return grades.map((grade) => {
    state = previewSm2({ interval: state.interval, repetition: state.repetition, ease_factor: state.easeFactor }, grade)
    return state
  })
}

describe('previewSm2 mirrors the backend SM-2', () => {
  it('follows 1, 6, 15 days and rounds half up', () => {
    expect(run([4, 4, 4]).map((step) => step.interval)).toEqual([1, 6, 15])
    expect(previewSm2({ interval: 15, repetition: 3, ease_factor: 2.5 }, 4).interval).toBe(38)
    expect(previewSm2({ interval: 5, repetition: 2, ease_factor: 2.5 }, 4).interval).toBe(13)
  })

  it('updates the ease factor by grade', () => {
    const card = { interval: 6, repetition: 2, ease_factor: 2.5 }
    expect(previewSm2(card, 3).easeFactor).toBeCloseTo(2.36)
    expect(previewSm2(card, 4).easeFactor).toBeCloseTo(2.5)
    expect(previewSm2(card, 5).easeFactor).toBeCloseTo(2.6)
  })

  it('never drops below 1.3', () => {
    const steps = run([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
    expect(steps[steps.length - 1].easeFactor).toBe(1.3)
  })

  it('resets on a lapse without touching the ease factor', () => {
    for (const grade of [0, 1, 2] as Grade[]) {
      expect(previewSm2({ interval: 40, repetition: 5, ease_factor: 2.1 }, grade)).toEqual({
        interval: 1,
        repetition: 0,
        easeFactor: 2.1,
      })
    }
  })

  it('reproduces the full history used by the backend tests', () => {
    expect(run([5, 5, 4, 2, 4, 4]).map((s) => [s.interval, s.repetition, s.easeFactor])).toEqual([
      [1, 1, 2.6],
      [6, 2, 2.7],
      [16, 3, 2.7],
      [1, 0, 2.7],
      [1, 1, 2.7],
      [6, 2, 2.7],
    ])
  })
})
