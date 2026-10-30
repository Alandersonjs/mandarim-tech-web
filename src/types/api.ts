/**
 * Types mirroring the Mandarim Tech AI backend (FastAPI) contracts.
 * Field names are the ones the API really returns (e.g. `portuguese`, not `meaning_pt`).
 */

export const HSK_LEVELS = ['HSK1_3.0', 'HSK2_3.0', 'HSK3_3.0', 'HSK4_3.0', 'HSK_TECH'] as const
export type HSKLevel = (typeof HSK_LEVELS)[number]

export const TERM_CATEGORIES = [
  'Computer Science',
  'Artificial Intelligence',
  'Software Engineering',
  'ERP',
  'Business',
  'General',
] as const
export type TermCategory = (typeof TERM_CATEGORIES)[number]

export type VoiceName = 'female' | 'male'

// ------------------------------- Vocabulary -------------------------------
export interface VocabularyTerm {
  id: number
  portuguese: string
  hanzi: string
  pinyin: string
  pinyin_numeric: string
  pinyin_guide: string
  category: TermCategory
  hsk_level: HSKLevel
  is_handwriting_required: boolean
  radical_breakdown: string[]
  example_sentence: string
  example_pinyin: string
  example_translation: string
}

export interface VocabularyListResponse {
  items: VocabularyTerm[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface VocabularyQuery {
  search?: string
  category?: TermCategory
  hsk_level?: HSKLevel
  page?: number
  page_size?: number
}

export interface HSKLevelSummary {
  level: HSKLevel
  target_cumulative_words: number | null
  seeded_terms: number
  handwriting_required_terms: number
}

export interface HSKLevelsResponse {
  levels: HSKLevelSummary[]
  note: string
}

// ----------------------------------- SRS -----------------------------------
export type Grade = 0 | 1 | 2 | 3 | 4 | 5

export interface SRSCard {
  id: number
  term: VocabularyTerm
  interval: number
  repetition: number
  ease_factor: number
  next_review_date: string
}

export interface SRSDueResponse {
  total_due: number
  items: SRSCard[]
}

export interface SRSReviewRequest {
  term_id: number
  grade: Grade
}

// ------------------------------ Sentence compiler ------------------------------
export type CompileRole = 'S' | 'T' | 'L' | 'V' | 'O' | 'LE'

export interface CompileRequest {
  subject?: string
  time?: string
  place?: string
  verb?: string
  /** The API names this field `object` (alias). */
  object?: string
  completed?: boolean
  le_position?: 'sentence_end' | 'after_verb'
  target_level?: HSKLevel
}

export interface CompiledComponent {
  role: CompileRole
  role_label: string
  input_text: string
  hanzi: string
  pinyin: string
  pinyin_numeric: string
  resolved: boolean
  hsk_level: HSKLevel | null
  note: string | null
}

export interface SyllableInfo {
  syllable: string
  hanzi: string | null
  tone: number | null
}

export interface CheckItem {
  name: string
  passed: boolean
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface HSKTaskCheck {
  conforms: boolean
  estimated_level: HSKLevel | null
  target_level: HSKLevel | null
  technical_terms: string[]
  checks: CheckItem[]
  disclaimer: string
}

export interface CompileResponse {
  sentence_hanzi: string
  sentence_pinyin: string
  sentence_pinyin_numeric: string
  syllables: SyllableInfo[]
  components: CompiledComponent[]
  structure_pattern: string
  structure_valid: boolean
  hsk_task_check: HSKTaskCheck
  warnings: string[]
}
