import allInSeed from './data/all-in-seed.json'
import moreLessSeed from './data/more-less-seed.json'

export type MoreLessQuestion = {
  question: string
  reference_value: number
  correct_value: number
  unit: string | null
  correct_side: 'MORE' | 'LESS'
}
export type AllInQuestion = {
  category: string
  question: string
  options: { text: string; is_correct: boolean }[]
}
const moreLessQuestions = moreLessSeed.questions as MoreLessQuestion[]
const allInQuestions = allInSeed.questions as AllInQuestion[]
export const randomMoreLess = () => moreLessQuestions[Math.floor(Math.random() * moreLessQuestions.length)]
export const randomAllIn = () => allInQuestions[Math.floor(Math.random() * allInQuestions.length)]
export const randomGambleType = () =>
  (['MORE_LESS', 'ALL_IN', 'ROULETTE'] as const)[Math.floor(Math.random() * 3)]
