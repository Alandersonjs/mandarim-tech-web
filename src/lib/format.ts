import type { HSKLevel, TermCategory } from '../types/api'

export function describeInterval(days: number): string {
  if (days <= 0) return 'hoje'
  if (days === 1) return '1 dia'
  if (days < 30) return `${days} dias`
  if (days < 365) {
    const months = Math.round(days / 30)
    return months === 1 ? '1 mês' : `${months} meses`
  }
  const years = Math.round((days / 365) * 10) / 10
  return `${years} anos`.replace('.', ',')
}

export function levelLabel(level: HSKLevel): string {
  return level === 'HSK_TECH' ? 'Tech' : `HSK ${level.charAt(3)}`
}

const CATEGORY_LABELS: Record<TermCategory, string> = {
  'Computer Science': 'Computação',
  'Artificial Intelligence': 'IA',
  'Software Engineering': 'Eng. de Software',
  ERP: 'ERP',
  Business: 'Negócios',
  General: 'Geral',
}

export function categoryLabel(category: TermCategory): string {
  return CATEGORY_LABELS[category] ?? category
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
