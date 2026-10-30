import type { HSKLevel } from '../types/api'

export interface PlaygroundForm {
  subject: string
  time: string
  place: string
  verb: string
  object: string
  completed: boolean
  lePosition: 'sentence_end' | 'after_verb'
  targetLevel: HSKLevel | ''
}

export const EMPTY_FORM: PlaygroundForm = {
  subject: '',
  time: '',
  place: '',
  verb: '',
  object: '',
  completed: false,
  lePosition: 'sentence_end',
  targetLevel: '',
}

export interface Preset {
  id: string
  label: string
  values: Partial<PlaygroundForm>
}

/** IT sentences built only with words the backend vocabulary knows (Hanzi or Pinyin). */
export const PRESETS: readonly Preset[] = [
  {
    id: 'bugfix',
    label: '我昨天修复bug了 — corrigi um bug ontem (em Pinyin)',
    values: { subject: 'wo', time: 'zuotian', verb: 'xiufu', object: 'bug', completed: true },
  },
  {
    id: 'code',
    label: '我在公司写代码 — escrevo código na empresa',
    values: { subject: '我', place: '公司', verb: '写', object: '代码' },
  },
  {
    id: 'deploy',
    label: '我们明天部署系统 — implantamos o sistema amanhã',
    values: { subject: '我们', time: '明天', verb: '部署', object: '系统' },
  },
  {
    id: 'test',
    label: '他今天测试程序 — ele testa o programa hoje',
    values: { subject: '他', time: '今天', verb: '测试', object: '程序' },
  },
  {
    id: 'level',
    label: '我写程序 — meta HSK 1: 程序 é HSK 2, deve gerar alerta',
    values: { subject: '我', verb: '写', object: '程序', targetLevel: 'HSK1_3.0' },
  },
  {
    id: 'error',
    label: '⚠ 我明天修复bug了 — erro didático: 了 com tempo futuro',
    values: { subject: '我', time: '明天', verb: '修复', object: 'bug', completed: true },
  },
]
