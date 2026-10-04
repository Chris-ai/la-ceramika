import type { ChallengeAnswer } from '../api/challengeApi'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { type RushTask } from '../model/rushData'
import { matchRushAnswer } from '../model/rushMatching'
import './RushGame.css'

export function RushGame({
  task,
  onResolved,
}: {
  task: RushTask
  onResolved: (result: 'WIN' | 'LOSS', answer?: ChallengeAnswer) => void
}) {
  const [input, setInput] = useState('')
  const [found, setFound] = useState<string[]>([])
  const foundRef = useRef<string[]>([])
  const [timeLeft, setTimeLeft] = useState(task.time_limit)
  const [result, setResult] = useState<'WIN' | 'LOSS' | null>(null)

  useEffect(() => {
    if (result) return
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          window.setTimeout(() => {
            const next = foundRef.current.length >= task.required_count ? 'WIN' : 'LOSS'
            setResult(next)
            onResolved(next, { answers: foundRef.current })
          }, 0)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [result, task.required_count, onResolved])

  function submitAnswer(event: FormEvent) {
    event.preventDefault()
    if (result || !input.trim()) return
    const match = matchRushAnswer(input, task.answers)
    if (!match || foundRef.current.includes(match.answer)) return
    const next = [...foundRef.current, match.answer]
    foundRef.current = next
    setFound(next)
    setInput('')
    if (next.length >= task.required_count) {
      setResult('WIN')
      onResolved('WIN', { answers: next })
    }
  }

  return (
    <div className="rush-game">
      <div
        className="rush-slots"
        aria-label={`Znalezione odpowiedzi: ${found.length} z ${task.required_count}`}
      >
        {Array.from({ length: task.required_count }, (_, index) => (
          <div className={`rush-slot ${found[index] ? 'rush-slot--filled' : ''}`} key={index}>
            <span>{index + 1}</span>
            <strong>{found[index] ?? ''}</strong>
          </div>
        ))}
      </div>
      <div className="rush-heading">
        <h3>{task.prompt}</h3>
        <span className={`rush-timer ${timeLeft <= 8 ? 'rush-timer--urgent' : ''}`}>
          <strong>{timeLeft}</strong>
          <small>sek.</small>
        </span>
      </div>
      <div className="rush-progress">
        <span style={{ width: `${(timeLeft / task.time_limit) * 100}%` }} />
      </div>
      <form className="rush-form" onSubmit={submitAnswer}>
        <input
          autoFocus
          value={input}
          disabled={result !== null}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Wpisz odpowiedź…"
          aria-label="Odpowiedź"
          autoComplete="off"
          enterKeyHint="done"
        />
      </form>
    </div>
  )
}
