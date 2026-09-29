import { useEffect, useState } from 'react'
import { randomMoreLess } from '../model/gambleData'

const TIME_SECONDS = 60

export function MoreLessGame({
  onResolved,
  initialQuestion,
}: {
  onResolved: (result: 'WIN' | 'LOSS') => void
  initialQuestion?: ReturnType<typeof randomMoreLess>
}) {
  const [question] = useState(() => initialQuestion ?? randomMoreLess())
  const [choice, setChoice] = useState<'MORE' | 'LESS' | null>(null)
  const [time, setTime] = useState(TIME_SECONDS)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    if (revealed) return
    const timer = window.setInterval(
      () =>
        setTime((value) => {
          if (value <= 1) {
            window.clearInterval(timer)
            window.setTimeout(() => setRevealed(true), 0)
            return 0
          }
          return value - 1
        }),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [revealed])
  const result = revealed ? (choice && choice === question.correct_side ? 'WIN' : 'LOSS') : null
  useEffect(() => {
    if (result) onResolved(result)
  }, [result, onResolved])
  const target = Math.max(
    7,
    Math.min(93, 50 + Math.log(question.correct_value / question.reference_value) * 30),
  )
  return (
    <div className="more-less">
      <div className="gamble-clock">
        <div className="gamble-progress">
          <span style={{ width: `${(time / TIME_SECONDS) * 100}%` }} />
        </div>
        <span className={`gamble-time ${time <= 8 ? 'gamble-time--urgent' : ''}`}>
          <strong>{time}</strong>
          <small>sek.</small>
        </span>
      </div>
      <h3>{question.question}</h3>
      <div className="value-axis">
        <div className="axis-line" />
        <span className="axis-reference" style={{ left: '50%' }}>
          <b>
            {question.reference_value.toLocaleString('pl-PL')} {question.unit}
          </b>
          <i />
        </span>
        {revealed && (
          <span className="axis-result" style={{ left: `${target}%` }}>
            <b>
              {question.correct_value.toLocaleString('pl-PL')} {question.unit}
            </b>
          </span>
        )}
      </div>
      <div className="more-less-buttons">
        <button
          className={choice === 'LESS' ? 'is-selected' : ''}
          disabled={revealed}
          onClick={() => setChoice('LESS')}
        >
          Mniej
        </button>
        <button
          className={choice === 'MORE' ? 'is-selected' : ''}
          disabled={revealed}
          onClick={() => setChoice('MORE')}
        >
          Więcej
        </button>
      </div>
      <button
        type="button"
        className="gamble-confirm"
        disabled={choice === null || revealed}
        onClick={() => setRevealed(true)}
      >
        Zatwierdź odpowiedź
      </button>
    </div>
  )
}
