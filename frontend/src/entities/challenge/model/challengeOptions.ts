import quizIcon from '@iconify-icons/game-icons/spell-book'
import rushIcon from '@iconify-icons/game-icons/stopwatch'
import gambleIcon from '@iconify-icons/game-icons/dice-twenty-faces-twenty'
import duelIcon from '@iconify-icons/game-icons/crossed-swords'

export type ChallengeType = 'QUIZ' | 'RUSH' | 'GAMBLE' | 'DUEL'

export const challengeOptions = [
  { type: 'QUIZ', label: 'QUIZ', icon: quizIcon, color: '#91abea' },
  { type: 'RUSH', label: 'RUSH', icon: rushIcon, color: '#63cfc1' },
  { type: 'GAMBLE', label: 'GAMBLE', icon: gambleIcon, color: '#f7ca62' },
  { type: 'DUEL', label: 'DUEL', icon: duelIcon, color: '#f28e9a' },
] as const
