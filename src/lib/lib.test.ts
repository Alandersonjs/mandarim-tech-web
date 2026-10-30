import { describe, expect, it } from 'vitest'
import { describeInterval, levelLabel, pluralize } from './format'
import { PRESETS } from './presets'
import { parseRadicalBlock } from './radicals'
import { toneClasses, toneName } from './tones'

describe('parseRadicalBlock', () => {
  it('parses meaning and radical', () => {
    expect(parseRadicalBlock('脑 (cérebro · radical 月 = carne/órgão)')).toEqual({
      char: '脑',
      meaning: 'cérebro',
      radical: { symbol: '月', description: 'carne/órgão' },
    })
  })

  it('parses a block without radical', () => {
    expect(parseRadicalBlock('电 (eletricidade)')).toEqual({ char: '电', meaning: 'eletricidade', radical: null })
  })

  it('keeps meanings that contain semicolons and falls back for unexpected text', () => {
    expect(parseRadicalBlock('数 (número; dados · radical 攵 = bater)').meaning).toBe('número; dados')
    expect(parseRadicalBlock('???')).toEqual({ char: '???', meaning: '', radical: null })
  })
})

describe('format helpers', () => {
  it('describes intervals in Portuguese', () => {
    expect(describeInterval(0)).toBe('hoje')
    expect(describeInterval(1)).toBe('1 dia')
    expect(describeInterval(6)).toBe('6 dias')
    expect(describeInterval(30)).toBe('1 mês')
    expect(describeInterval(90)).toBe('3 meses')
    expect(describeInterval(400)).toBe('1,1 anos')
  })

  it('labels levels and pluralises', () => {
    expect(levelLabel('HSK1_3.0')).toBe('HSK 1')
    expect(levelLabel('HSK4_3.0')).toBe('HSK 4')
    expect(levelLabel('HSK_TECH')).toBe('Tech')
    expect(pluralize(1, 'termo', 'termos')).toBe('1 termo')
    expect(pluralize(3, 'termo', 'termos')).toBe('3 termos')
  })
})

describe('tones', () => {
  it('has a distinct style per tone and a name for each', () => {
    const styles = new Set([1, 2, 3, 4, 0].map(toneClasses))
    expect(styles.size).toBe(5)
    expect(toneClasses(null)).toBe(toneClasses(0))
    expect(toneName(3)).toContain('3º')
    expect(toneName(null)).toContain('não chinês')
  })
})

describe('playground presets', () => {
  it('have unique ids and at least a subject or verb to compile', () => {
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length)
    for (const preset of PRESETS) {
      expect(preset.values.subject || preset.values.verb).toBeTruthy()
    }
  })
})
