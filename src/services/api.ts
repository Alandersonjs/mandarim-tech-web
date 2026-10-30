/**
 * Single entry point to the Mandarim Tech AI backend.
 * Every function is typed and failures are normalised into `ApiError`.
 */
import axios, { AxiosError } from 'axios'
import type {
  CompileRequest,
  CompileResponse,
  Grade,
  HSKLevelsResponse,
  SRSCard,
  SRSDueResponse,
  VocabularyListResponse,
  VocabularyQuery,
  VoiceName,
} from '../types/api'

export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
})

// ------------------------------- error handling -------------------------------
export type ApiErrorKind = 'network' | 'timeout' | 'validation' | 'not_found' | 'server' | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

/** FastAPI sends `detail` as a string, or as a list of `{ msg }` for validation errors. */
export function extractDetail(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('detail' in data)) return null
  const detail = (data as { detail: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item === 'object' && 'msg' in item ? String((item as { msg: unknown }).msg) : null))
      .filter((message): message is string => Boolean(message))
    return messages.length > 0 ? messages.join('; ') : null
  }
  return null
}

/** `Blob.text()` is missing in some environments (old Safari, jsdom): fall back to FileReader. */
function blobToText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

/** Realm-safe check (`instanceof` fails for buffers created in another JS realm, e.g. jsdom vs Node). */
function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]'
}

/**
 * Error bodies of binary requests (the TTS MP3) do not arrive as parsed JSON: browsers give a
 * Blob, Node gives a Buffer/ArrayBuffer. Decode any of them and read FastAPI's `detail`.
 */
async function readErrorDetail(data: unknown): Promise<string | null> {
  try {
    if (typeof Blob !== 'undefined' && data instanceof Blob) return extractDetail(JSON.parse(await blobToText(data)))
    if (isArrayBuffer(data) || ArrayBuffer.isView(data)) {
      const bytes = isArrayBuffer(data) ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      return extractDetail(JSON.parse(new TextDecoder().decode(bytes)))
    }
    if (typeof data === 'string') return extractDetail(JSON.parse(data))
  } catch {
    return null
  }
  return extractDetail(data)
}

/** Turns anything thrown by axios into a user-friendly `ApiError` (messages in Portuguese). */
export async function toApiError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError('Requisição cancelada.', 'unknown')

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return new ApiError('A API demorou demais para responder. Tente novamente.', 'timeout')
    }
    if (!axiosError.response) {
      return new ApiError(
        `Não foi possível conectar à API em ${API_BASE_URL}. O backend está rodando e o CORS libera esta origem?`,
        'network',
      )
    }
    const { status, data } = axiosError.response
    const detail = await readErrorDetail(data)
    if (status === 404) return new ApiError(detail ?? 'Recurso não encontrado.', 'not_found', status)
    if (status === 422) return new ApiError(detail ?? 'Dados inválidos.', 'validation', status)
    if (status >= 500) {
      return new ApiError(detail ?? 'O servidor encontrou um erro. Tente novamente em instantes.', 'server', status)
    }
    return new ApiError(detail ?? `Erro inesperado (HTTP ${status}).`, 'unknown', status)
  }
  return new ApiError(error instanceof Error ? error.message : 'Erro desconhecido.', 'unknown')
}

async function request<T>(call: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await call()).data
  } catch (error) {
    throw await toApiError(error)
  }
}

// ----------------------------------- health -----------------------------------
export function getHealth(signal?: AbortSignal): Promise<{ status: string }> {
  return request(() => api.get('/health', { signal, timeout: 5_000 }))
}

// -------------------------------------- SRS --------------------------------------
export function getDueCards(limit = 20, signal?: AbortSignal): Promise<SRSDueResponse> {
  return request(() => api.get<SRSDueResponse>('/api/srs/due', { params: { limit }, signal }))
}

export function submitReview(termId: number, grade: Grade): Promise<SRSCard> {
  return request(() => api.post<SRSCard>('/api/srs/review', { term_id: termId, grade }))
}

// ---------------------------------- vocabulary ----------------------------------
/** Drops empty filters so the backend never receives `search=` (it rejects empty strings). */
export function cleanQuery(query: VocabularyQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  const search = query.search?.trim()
  if (search) params.search = search
  if (query.category) params.category = query.category
  if (query.hsk_level) params.hsk_level = query.hsk_level
  if (query.page) params.page = query.page
  if (query.page_size) params.page_size = query.page_size
  return params
}

export function searchVocabulary(query: VocabularyQuery, signal?: AbortSignal): Promise<VocabularyListResponse> {
  return request(() => api.get<VocabularyListResponse>('/api/vocabulary', { params: cleanQuery(query), signal }))
}

export function getHskLevels(signal?: AbortSignal): Promise<HSKLevelsResponse> {
  return request(() => api.get<HSKLevelsResponse>('/api/vocabulary/hsk-levels', { signal }))
}

// ------------------------------- sentence compiler -------------------------------
/** Removes blank pieces: the API treats them as "not provided" but this keeps payloads tidy. */
export function cleanCompilePayload(payload: CompileRequest): CompileRequest {
  const cleaned: CompileRequest = { ...payload }
  for (const key of ['subject', 'time', 'place', 'verb', 'object'] as const) {
    const value = cleaned[key]?.trim()
    if (value) cleaned[key] = value
    else delete cleaned[key]
  }
  return cleaned
}

export function compileSentence(payload: CompileRequest): Promise<CompileResponse> {
  return request(() => api.post<CompileResponse>('/api/grammar/compile', cleanCompilePayload(payload)))
}

// ------------------------------------- TTS -------------------------------------
/**
 * The API requires an explicit sign ("+0%", "-10%"); "0%" would be rejected with 422.
 * Accepts both and always returns the signed form.
 */
export function normalizeRate(rate: string): string {
  const trimmed = rate.trim()
  return /^\d+%$/.test(trimmed) ? `+${trimmed}` : trimmed
}

/** Direct URL of the MP3, usable as the `src` of an <audio> element. */
export function ttsUrl(text: string, voice: VoiceName = 'female', rate = '+0%'): string {
  const params = new URLSearchParams({ text, voice, rate: normalizeRate(rate) })
  return `${API_BASE_URL}/api/tts/generate?${params.toString()}`
}

/** Downloads the MP3 as a Blob, so failures (502/504...) can be shown with the API's own message. */
export function fetchTtsAudio(
  text: string,
  voice: VoiceName = 'female',
  rate = '+0%',
  signal?: AbortSignal,
): Promise<Blob> {
  return request(() =>
    api.get<Blob>('/api/tts/generate', {
      params: { text, voice, rate: normalizeRate(rate) },
      responseType: 'blob',
      timeout: 30_000,
      signal,
    }),
  )
}
