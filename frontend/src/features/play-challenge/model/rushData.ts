import rushSeed from './data/rush-seed.json'

export type RushAnswer = { answer: string; aliases: string[] }
export type RushTask = {
  prompt: string
  required_count: number
  time_limit: number
  answers: RushAnswer[]
}

const tasks = rushSeed.tasks as RushTask[]
export const randomRushTask = () => tasks[Math.floor(Math.random() * tasks.length)]

export { normalizeRushAnswer } from './rushMatching'
