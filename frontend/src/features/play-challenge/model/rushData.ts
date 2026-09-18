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

export const normalizeRushAnswer = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl')
    .trim()
    .replace(/\s+/g, ' ')
