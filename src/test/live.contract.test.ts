// @vitest-environment node
/**
 * Contract test against the REAL backend (skipped unless LIVE_API=1).
 *
 *   uvicorn app.main:app --port 8000      # in the backend project (use a throw-away database!)
 *   npm run test:live
 *
 * It checks that the real JSON has every field the UI reads, and that the client-side SM-2
 * preview agrees with what the backend really schedules. It WRITES reviews to the database.
 */
import { describe, expect, it } from 'vitest'
import { previewSm2 } from '../lib/sm2Preview'
import {
  ApiError,
  compileSentence,
  fetchTtsAudio,
  getDueCards,
  getHealth,
  getHskLevels,
  searchVocabulary,
  submitReview,
} from '../services/api'
import type { Grade, VocabularyTerm } from '../types/api'

const live = process.env.LIVE_API === '1'

function expectTermShape(term: VocabularyTerm) {
  expect(typeof term.id).toBe('number')
  for (const key of ['portuguese', 'hanzi', 'pinyin', 'pinyin_numeric', 'pinyin_guide', 'category', 'hsk_level', 'example_sentence', 'example_pinyin', 'example_translation'] as const) {
    expect(typeof term[key], key).toBe('string')
  }
  expect(typeof term.is_handwriting_required).toBe('boolean')
  expect(Array.isArray(term.radical_breakdown)).toBe(true)
}

describe.skipIf(!live)('live backend contract', () => {
  it('is healthy', async () => {
    expect(await getHealth()).toEqual({ status: 'ok' })
  })

  it('GET /api/srs/due has the shape the review screen reads', async () => {
    const due = await getDueCards(3)
    expect(due.total_due).toBeGreaterThan(0)
    expect(due.items.length).toBe(3)
    const card = due.items[0]
    expect(typeof card.id).toBe('number')
    expect(typeof card.interval).toBe('number')
    expect(typeof card.repetition).toBe('number')
    expect(typeof card.ease_factor).toBe('number')
    expect(Number.isNaN(Date.parse(card.next_review_date))).toBe(false)
    expectTermShape(card.term)
  })

  it('the client SM-2 preview equals the interval the backend schedules', async () => {
    const [first] = (await getDueCards(1)).items
    let state = { interval: first.interval, repetition: first.repetition, ease_factor: first.ease_factor }

    for (const grade of [4, 4, 4, 5, 3, 2, 4, 4] as Grade[]) {
      const preview = previewSm2(state, grade)
      const real = await submitReview(first.term.id, grade)
      expect({ interval: real.interval, repetition: real.repetition, ease: real.ease_factor }, `grade ${grade}`).toEqual({
        interval: preview.interval,
        repetition: preview.repetition,
        ease: preview.easeFactor,
      })
      state = { interval: real.interval, repetition: real.repetition, ease_factor: real.ease_factor }
    }
  })

  it('a reviewed card leaves the due list', async () => {
    const [card] = (await getDueCards(1)).items
    const before = (await getDueCards(1)).total_due
    await submitReview(card.term.id, 4)
    expect((await getDueCards(1)).total_due).toBe(before - 1)
  })

  it('reviewing an unknown term is a 404 ApiError', async () => {
    await expect(submitReview(999_999, 4)).rejects.toMatchObject({ kind: 'not_found', status: 404 })
  })

  it('GET /api/vocabulary supports search with or without tones, categories and levels', async () => {
    for (const query of ['shuju', 'shu4ju4', 'shùjù', '数据']) {
      const result = await searchVocabulary({ search: query })
      expect(result.items.map((term) => term.hanzi), query).toContain('数据库')
    }
    const erp = await searchVocabulary({ category: 'ERP' })
    expect(erp.items.length).toBeGreaterThan(0)
    expect(erp.items.every((term) => term.category === 'ERP')).toBe(true)
    const tech = await searchVocabulary({ hsk_level: 'HSK_TECH', page_size: 100 })
    expect(tech.items.every((term) => term.hsk_level === 'HSK_TECH')).toBe(true)
    expectTermShape(tech.items[0])
  })

  it('GET /api/vocabulary/hsk-levels lists every level', async () => {
    const { levels } = await getHskLevels()
    expect(levels.map((level) => level.level)).toEqual(['HSK1_3.0', 'HSK2_3.0', 'HSK3_3.0', 'HSK4_3.0', 'HSK_TECH'])
    expect(levels[0].target_cumulative_words).toBe(300)
  })

  it('POST /api/grammar/compile builds the documented example', async () => {
    const result = await compileSentence({ subject: 'wo', time: 'zuotian', verb: 'xiufu', object: 'bug', completed: true })
    expect(result.sentence_hanzi).toBe('我昨天修复bug了。')
    expect(result.sentence_pinyin_numeric).toBe('Wo3 zuo2tian1 xiu1fu4 bug le0')
    expect(result.structure_valid).toBe(true)
    expect(result.components.map((component) => component.role)).toEqual(['S', 'T', 'V', 'O', 'LE'])
    expect(result.syllables[0]).toEqual({ syllable: 'wo3', hanzi: '我', tone: 3 })
  })

  it('compile validation errors come back as readable ApiErrors', async () => {
    await expect(compileSentence({ completed: true })).rejects.toMatchObject({ kind: 'validation', status: 422 })
  })

  it('TTS answers with audio, or with a readable error when the voice service is unreachable', async () => {
    try {
      const blob = await fetchTtsAudio('你好', 'female', '0%')
      expect(blob.size).toBeGreaterThan(500)
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect([502, 504]).toContain((error as ApiError).status)
      expect((error as ApiError).message).toMatch(/serviço de voz/)
    }
  })
})
