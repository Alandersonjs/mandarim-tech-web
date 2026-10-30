import type { CompileResponse, SRSCard, VocabularyListResponse, VocabularyTerm } from '../types/api'

export function makeTerm(overrides: Partial<VocabularyTerm> = {}): VocabularyTerm {
  return {
    id: 1,
    portuguese: 'Banco de dados',
    hanzi: '数据库',
    pinyin: 'shùjùkù',
    pinyin_numeric: 'shu4ju4ku4',
    pinyin_guide: 'chu-djü-ku (sh = ch forte)',
    category: 'Computer Science',
    hsk_level: 'HSK_TECH',
    is_handwriting_required: false,
    radical_breakdown: ['数 (número; dados · radical 攵 = bater)', '据 (base; segundo · radical 扌 = mão)', '库 (armazém)'],
    example_sentence: '我们使用数据库存储客户信息。',
    example_pinyin: 'wǒ men shǐ yòng shù jù kù',
    example_translation: 'Nós usamos um banco de dados.',
    ...overrides,
  }
}

export function makeCard(overrides: Partial<SRSCard> = {}, term: Partial<VocabularyTerm> = {}): SRSCard {
  const base = makeTerm(term)
  return {
    id: base.id,
    term: base,
    interval: 0,
    repetition: 0,
    ease_factor: 2.5,
    next_review_date: '2026-10-27T12:00:00Z',
    ...overrides,
  }
}

export function makeList(items: VocabularyTerm[], overrides: Partial<VocabularyListResponse> = {}): VocabularyListResponse {
  return { items, total: items.length, page: 1, page_size: 12, total_pages: 1, ...overrides }
}

export function makeCompileResponse(overrides: Partial<CompileResponse> = {}): CompileResponse {
  return {
    sentence_hanzi: '我昨天修复bug了。',
    sentence_pinyin: 'Wǒ zuótiān xiūfù bug le.',
    sentence_pinyin_numeric: 'Wo3 zuo2tian1 xiu1fu4 bug le0',
    syllables: [
      { syllable: 'wo3', hanzi: '我', tone: 3 },
      { syllable: 'zuo2', hanzi: '昨', tone: 2 },
      { syllable: 'bug', hanzi: null, tone: null },
      { syllable: 'le0', hanzi: '了', tone: 0 },
    ],
    components: [
      { role: 'S', role_label: 'Sujeito', input_text: 'wo', hanzi: '我', pinyin: 'wǒ', pinyin_numeric: 'wo3', resolved: true, hsk_level: 'HSK1_3.0', note: null },
      { role: 'T', role_label: 'Tempo', input_text: 'zuotian', hanzi: '昨天', pinyin: 'zuótiān', pinyin_numeric: 'zuo2tian1', resolved: true, hsk_level: 'HSK1_3.0', note: null },
      { role: 'V', role_label: 'Verbo', input_text: 'xiufu', hanzi: '修复', pinyin: 'xiūfù', pinyin_numeric: 'xiu1fu4', resolved: true, hsk_level: 'HSK_TECH', note: null },
      { role: 'O', role_label: 'Objeto', input_text: 'bug', hanzi: 'bug', pinyin: 'bug', pinyin_numeric: 'bug', resolved: true, hsk_level: null, note: 'Termo não chinês mantido como está.' },
      { role: 'LE', role_label: 'Partícula 了', input_text: '了', hanzi: '了', pinyin: 'le', pinyin_numeric: 'le0', resolved: true, hsk_level: null, note: 'Partícula de ação concluída.' },
    ],
    structure_pattern: 'S + T + V + O + 了',
    structure_valid: true,
    hsk_task_check: {
      conforms: true,
      estimated_level: 'HSK1_3.0',
      target_level: null,
      technical_terms: ['修复'],
      checks: [
        { name: 'Sujeito (S)', passed: true, severity: 'error', message: 'Sujeito presente.' },
        { name: 'Vocabulário', passed: false, severity: 'warning', message: 'Peças não reconhecidas.' },
      ],
      disclaimer: 'Checklist didático.',
    },
    warnings: [],
    ...overrides,
  }
}
