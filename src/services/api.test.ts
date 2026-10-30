import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ApiError,
  api,
  cleanCompilePayload,
  cleanQuery,
  compileSentence,
  extractDetail,
  fetchTtsAudio,
  getDueCards,
  normalizeRate,
  searchVocabulary,
  submitReview,
  ttsUrl,
} from './api'

let lastConfig: InternalAxiosRequestConfig | undefined

function respondWith(status: number, data: unknown) {
  api.defaults.adapter = async (config) => {
    lastConfig = config
    const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse
    if (status >= 400) throw new AxiosError('request failed', 'ERR_BAD_REQUEST', config, null, response)
    return response
  }
}

function failWith(code: string) {
  api.defaults.adapter = async (config) => {
    lastConfig = config
    throw new AxiosError('boom', code, config)
  }
}

beforeEach(() => {
  lastConfig = undefined
})

describe('rate and URL helpers', () => {
  it('always sends the explicit sign the backend requires', () => {
    expect(normalizeRate('0%')).toBe('+0%')
    expect(normalizeRate('+0%')).toBe('+0%')
    expect(normalizeRate('-10%')).toBe('-10%')
    expect(normalizeRate(' 20% ')).toBe('+20%')
  })

  it('builds an <audio> URL with the "+" percent-encoded', () => {
    const url = ttsUrl('你好', 'male', '0%')
    expect(url).toContain('/api/tts/generate?')
    expect(url).toContain('voice=male')
    expect(url).toContain('rate=%2B0%25')
    expect(url).toContain(`text=${encodeURIComponent('你好')}`)
  })
})

describe('cleanQuery / cleanCompilePayload', () => {
  it('drops empty filters (the backend rejects `search=`)', () => {
    expect(cleanQuery({ search: '   ', category: undefined, page: 1 })).toEqual({ page: 1 })
    expect(cleanQuery({ search: ' shuju ', hsk_level: 'HSK1_3.0', category: 'ERP', page_size: 12 })).toEqual({
      search: 'shuju',
      hsk_level: 'HSK1_3.0',
      category: 'ERP',
      page_size: 12,
    })
  })

  it('removes blank pieces and keeps the API key name `object`', () => {
    expect(cleanCompilePayload({ subject: ' wo ', time: '', place: '  ', verb: 'xiufu', object: 'bug', completed: true })).toEqual({
      subject: 'wo',
      verb: 'xiufu',
      object: 'bug',
      completed: true,
    })
  })
})

describe('extractDetail', () => {
  it('reads string and validation-list details', () => {
    expect(extractDetail({ detail: 'Termo não encontrado.' })).toBe('Termo não encontrado.')
    expect(extractDetail({ detail: [{ msg: 'Value error, A' }, { msg: 'B' }] })).toBe('Value error, A; B')
    expect(extractDetail({ detail: [] })).toBeNull()
    expect(extractDetail(null)).toBeNull()
    expect(extractDetail({ other: 1 })).toBeNull()
  })
})

describe('requests', () => {
  it('getDueCards sends the limit as a query param', async () => {
    respondWith(200, { total_due: 0, items: [] })
    await getDueCards(5)
    expect(lastConfig?.url).toBe('/api/srs/due')
    expect(lastConfig?.params).toEqual({ limit: 5 })
  })

  it('submitReview posts term_id and grade', async () => {
    respondWith(200, { id: 1 })
    await submitReview(7, 4)
    expect(lastConfig?.method).toBe('post')
    expect(lastConfig?.url).toBe('/api/srs/review')
    expect(JSON.parse(lastConfig?.data as string)).toEqual({ term_id: 7, grade: 4 })
  })

  it('searchVocabulary only forwards non-empty filters', async () => {
    respondWith(200, { items: [], total: 0, page: 1, page_size: 12, total_pages: 0 })
    await searchVocabulary({ search: '', category: 'ERP', page: 2 })
    expect(lastConfig?.params).toEqual({ category: 'ERP', page: 2 })
  })

  it('compileSentence posts the cleaned payload', async () => {
    respondWith(200, {})
    await compileSentence({ subject: 'wo', object: 'bug', verb: '', completed: true })
    expect(JSON.parse(lastConfig?.data as string)).toEqual({ subject: 'wo', object: 'bug', completed: true })
  })

  it('fetchTtsAudio asks for a blob with a signed rate', async () => {
    respondWith(200, new Blob(['mp3']))
    await fetchTtsAudio('你好', 'female', '0%')
    expect(lastConfig?.responseType).toBe('blob')
    expect(lastConfig?.params).toEqual({ text: '你好', voice: 'female', rate: '+0%' })
  })
})

describe('error mapping', () => {
  it('explains a network failure', async () => {
    failWith('ERR_NETWORK')
    await expect(getDueCards()).rejects.toMatchObject({ kind: 'network' })
    await expect(getDueCards()).rejects.toThrow(/conectar à API/)
  })

  it('maps timeouts', async () => {
    failWith('ECONNABORTED')
    await expect(getDueCards()).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('maps 404, 422 and 5xx with the API message', async () => {
    respondWith(404, { detail: 'Termo com id 9 não encontrado.' })
    await expect(submitReview(9, 4)).rejects.toMatchObject({ kind: 'not_found', status: 404, message: 'Termo com id 9 não encontrado.' })

    respondWith(422, { detail: [{ msg: 'Informe pelo menos uma parte da frase' }] })
    await expect(compileSentence({})).rejects.toMatchObject({ kind: 'validation', message: 'Informe pelo menos uma parte da frase' })

    respondWith(500, { detail: 'Erro ao consultar o vocabulário.' })
    await expect(getDueCards()).rejects.toMatchObject({ kind: 'server', status: 500 })
  })

  it('reads the message of a TTS failure sent as a JSON blob', async () => {
    respondWith(502, new Blob([JSON.stringify({ detail: 'O serviço de voz está indisponível.' })]))
    const error = await fetchTtsAudio('你好').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'server', status: 502, message: 'O serviço de voz está indisponível.' })
  })

  it('also reads error bodies that arrive as ArrayBuffer, typed arrays or text (Node, other adapters)', async () => {
    const body = JSON.stringify({ detail: 'O serviço de voz está indisponível.' })
    for (const data of [new TextEncoder().encode(body), new TextEncoder().encode(body).buffer, body]) {
      respondWith(502, data)
      await expect(fetchTtsAudio('你好')).rejects.toMatchObject({ status: 502, message: 'O serviço de voz está indisponível.' })
    }
    respondWith(502, new TextEncoder().encode('<html>Bad Gateway</html>'))
    await expect(fetchTtsAudio('你好')).rejects.toMatchObject({ status: 502, kind: 'server' })
  })
})
