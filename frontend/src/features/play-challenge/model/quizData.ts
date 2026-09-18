import quizSeed from './data/quiz-seed.json'

export type AbcdOption = { text: string; is_correct: boolean }
export type OrderOption = { text: string; correct_position: number }
export type QuizQuestion =
  | { type: 'ABCD'; category: string; question: string; options: AbcdOption[] }
  | { type: 'ORDER'; category: string; question: string; options: OrderOption[] }

const questions = quizSeed.questions as QuizQuestion[]
export const randomQuizQuestion = () => questions[Math.floor(Math.random() * questions.length)]
