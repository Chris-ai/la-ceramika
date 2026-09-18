import { create } from 'zustand'
import type { Duel } from '../api/duelApi'
import type { DuelSnapshot } from './duelChannel'

type DuelState = DuelSnapshot & {
  setDuel(duel: Duel): void
  start(): void
  setTimers(attackerMs: number, defenderMs: number): void
  switchPlayer(): void
  pass(): void
  finish(winnerTeamId: string): void
  reset(): void
}

const empty: DuelSnapshot = {
  duel: null,
  phase: 'IDLE',
  attackerMs: 45000,
  defenderMs: 45000,
  activeTeamId: null,
  winnerTeamId: null,
}

export const useDuelStore = create<DuelState>((set) => ({
  ...empty,
  setDuel: (duel) =>
    set({
      ...empty,
      duel,
      phase: duel.status === 'ACTIVE' ? 'ACTIVE' : 'INTRO',
      activeTeamId: duel.attacker.id,
    }),
  start: () => set((state) => ({ phase: 'ACTIVE', activeTeamId: state.duel?.attacker.id ?? null })),
  setTimers: (attackerMs, defenderMs) => set({ attackerMs, defenderMs }),
  switchPlayer: () =>
    set((state) => ({
      activeTeamId:
        state.activeTeamId === state.duel?.attacker.id
          ? (state.duel?.defender.id ?? null)
          : (state.duel?.attacker.id ?? null),
    })),
  pass: () =>
    set((state) =>
      state.activeTeamId === state.duel?.attacker.id
        ? { attackerMs: Math.max(0, state.attackerMs - 3000) }
        : { defenderMs: Math.max(0, state.defenderMs - 3000) },
    ),
  finish: (winnerTeamId) => set({ phase: 'RESULT', winnerTeamId }),
  reset: () => set(empty),
}))

export const duelSnapshot = (): DuelSnapshot => {
  const { duel, phase, attackerMs, defenderMs, activeTeamId, winnerTeamId } = useDuelStore.getState()
  return { duel, phase, attackerMs, defenderMs, activeTeamId, winnerTeamId }
}
