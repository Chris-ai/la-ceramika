import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { Game } from '@/entities/game'
import { finishDuel, nextDuelPrompt, startDuel, type Duel } from '../api/duelApi'
import { createDuelTransport } from './duelChannel'
import { duelSnapshot, useDuelStore } from './duelStore'

export function useDuelController(initialDuel: Duel, onGameUpdated: (game: Game) => void) {
  const snapshot = useDuelStore()
  const finishing = useRef(false)
  const changingPrompt = useRef(false)
  const [retryIndex, setRetryIndex] = useState(0)
  const transport = useMemo(() => createDuelTransport(initialDuel.gameId), [initialDuel.gameId])
  const startMutation = useMutation({ mutationFn: startDuel })
  const promptMutation = useMutation({ mutationFn: nextDuelPrompt })
  const finishMutation = useMutation({
    mutationFn: ({ duel, winnerId }: { duel: Duel; winnerId: string }) => finishDuel(duel, winnerId),
  })

  useEffect(() => {
    useDuelStore.getState().setDuel(initialDuel)
    const unsubscribe = transport.subscribe((message) => {
      if (message.kind === 'REQUEST_SNAPSHOT') transport.publish(duelSnapshot())
    })
    transport.publish(duelSnapshot())
    return () => {
      unsubscribe()
      transport.close()
      useDuelStore.getState().reset()
    }
  }, [initialDuel, transport])

  useEffect(() => {
    transport.publish(duelSnapshot())
  }, [
    snapshot.duel,
    snapshot.phase,
    snapshot.attackerMs,
    snapshot.defenderMs,
    snapshot.activeTeamId,
    snapshot.winnerTeamId,
    transport,
  ])

  useEffect(() => {
    if (snapshot.phase !== 'ACTIVE' || !snapshot.duel) return
    let previous = performance.now()
    const interval = window.setInterval(() => {
      const now = performance.now()
      const delta = now - previous
      previous = now
      if (changingPrompt.current) return
      const state = useDuelStore.getState()
      if (state.activeTeamId === state.duel?.attacker.id) {
        state.setTimers(Math.max(0, state.attackerMs - delta), state.defenderMs)
      } else {
        state.setTimers(state.attackerMs, Math.max(0, state.defenderMs - delta))
      }
    }, 100)
    return () => window.clearInterval(interval)
  }, [snapshot.phase, snapshot.duel])

  useEffect(() => {
    if (snapshot.phase !== 'ACTIVE' || finishing.current || !snapshot.duel) return
    const loserId =
      snapshot.attackerMs <= 0
        ? snapshot.duel.attacker.id
        : snapshot.defenderMs <= 0
          ? snapshot.duel.defender.id
          : null
    if (!loserId) return
    finishing.current = true
    const winnerId =
      loserId === snapshot.duel.attacker.id ? snapshot.duel.defender.id : snapshot.duel.attacker.id
    void finishMutation
      .mutateAsync({ duel: snapshot.duel, winnerId })
      .then(({ game }) => {
        onGameUpdated(game)
        useDuelStore.getState().finish(winnerId)
      })
      .catch(() => undefined)
  }, [
    snapshot.attackerMs,
    snapshot.defenderMs,
    snapshot.phase,
    snapshot.duel,
    onGameUpdated,
    finishMutation,
    retryIndex,
  ])

  async function begin() {
    if (!snapshot.duel) return
    await startMutation.mutateAsync(snapshot.duel)
    useDuelStore.getState().start()
  }

  async function switchPlayer() {
    await advancePrompt(false)
  }

  async function advancePrompt(passing: boolean) {
    const state = useDuelStore.getState()
    if (!state.duel || state.phase !== 'ACTIVE' || changingPrompt.current || finishing.current) return
    changingPrompt.current = true
    try {
      if (state.duel.type === 'IDENTIFY') {
        const duel = await promptMutation.mutateAsync(state.duel)
        if (useDuelStore.getState().phase !== 'ACTIVE' || finishing.current) return
        useDuelStore.getState().updateDuel(duel)
      }
      if (passing) useDuelStore.getState().pass()
      else useDuelStore.getState().switchPlayer()
    } finally {
      changingPrompt.current = false
    }
  }

  const mutationError = startMutation.error ?? promptMutation.error ?? finishMutation.error

  return {
    snapshot,
    retryFinish: finishMutation.isError
      ? () => {
          finishing.current = false
          setRetryIndex((value) => value + 1)
        }
      : undefined,
    isStarting: startMutation.isPending,
    isPromptLoading: promptMutation.isPending,
    error:
      mutationError instanceof Error
        ? mutationError.message
        : mutationError
          ? 'Nie udało się wykonać akcji pojedynku.'
          : null,
    begin,
    pass: () => advancePrompt(true),
    switchPlayer,
  }
}
