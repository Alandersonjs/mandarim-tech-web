/** Parser for the backend's `radical_breakdown` strings, e.g. "脑 (cérebro · radical 月 = carne/órgão)". */

export interface RadicalBlock {
  char: string
  meaning: string
  radical: { symbol: string; description: string } | null
}

export function parseRadicalBlock(raw: string): RadicalBlock {
  const match = /^(.+?)\s*\((.*)\)\s*$/u.exec(raw)
  if (!match) return { char: raw, meaning: '', radical: null }

  const [, char, inside] = match
  const [meaning, radicalPart] = inside.split(' · radical ')
  if (!radicalPart) return { char, meaning: meaning.trim(), radical: null }

  const [symbol, description = ''] = radicalPart.split(' = ')
  return { char, meaning: meaning.trim(), radical: { symbol: symbol.trim(), description: description.trim() } }
}
