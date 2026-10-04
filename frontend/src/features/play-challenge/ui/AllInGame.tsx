import type { ChallengeAnswer } from '../api/challengeApi'
import { useState } from 'react'
import { randomAllIn } from '../model/gambleData'

export function AllInGame({
  onResolved,
  initialQuestion,
}: {
  onResolved: (result: 'WIN' | 'LOSS', answer?: ChallengeAnswer) => void
  initialQuestion?: ReturnType<typeof randomAllIn>
}) {
  const [question] = useState(() => initialQuestion ?? randomAllIn())
  const [stakes, setStakes] = useState([0, 0, 0, 0])
  const [result, setResult] = useState<'WIN' | 'LOSS' | null>(null)
  const used = stakes.reduce((sum, value) => sum + value, 0)
  const change = (index: number, delta: number) =>
    setStakes((current) => {
      if (result) return current
      const next = [...current]
      if ((delta > 0 && used >= 100) || (delta < 0 && next[index] <= 0)) return current
      next[index] += delta
      return next
    })
  const check = () => {
    const correct = question.options.findIndex((option) => option.is_correct)
    const next = stakes[correct] >= 50 ? 'WIN' : 'LOSS'
    setResult(next)
    onResolved(next, { stakes })
  }
  return (
    <div className="all-in">
      <div className="all-in-bank">
        <strong>{100 - used}</strong>
        <span>żetonów zostało</span>
      </div>
      <h3>{question.question}</h3>
      <div className="all-in-options">
        {question.options.map((option, index) => {
          const drain = result && !option.is_correct
          return (
            <div
              className={`all-in-option ${result && option.is_correct ? 'is-correct' : ''} ${drain ? 'is-draining' : ''}`}
              key={option.text}
            >
              <strong>{option.text}</strong>
              <div className="token-capsule">
                <span style={{ height: `${stakes[index]}%` }} />
              </div>
              <b>{drain ? 0 : stakes[index]}</b>
              <div className="stake-buttons">
                <button disabled={!!result || stakes[index] === 0} onClick={() => change(index, -25)}>
                  −
                </button>
                <button disabled={!!result || used === 100} onClick={() => change(index, 25)}>
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {!result && (
        <button className="gamble-confirm" disabled={used !== 100} onClick={check}>
          Zatwierdź ALL IN
        </button>
      )}
    </div>
  )
}
