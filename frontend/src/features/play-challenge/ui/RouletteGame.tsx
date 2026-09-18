import { useEffect, useState } from 'react'

const numbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22,
  18, 29, 7, 28, 12, 35, 3, 26,
]
const red = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export function RouletteGame({
  onResolved,
  onSpin,
  onServerResolved,
}: {
  onResolved: (result: 'WIN' | 'LOSS') => void
  onSpin?: (
    choice: 'RED' | 'BLACK',
  ) => Promise<{ number: number; color: 'RED' | 'BLACK' | 'GREEN'; result: 'WIN' | 'LOSS' }>
  onServerResolved?: (result: 'WIN' | 'LOSS') => void
}) {
  const [bet, setBet] = useState<'RED' | 'BLACK' | null>(null)
  const [number, setNumber] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [serverColor, setServerColor] = useState<'RED' | 'BLACK' | 'GREEN' | null>(null)
  const color =
    serverColor ?? (number === null ? null : number === 0 ? 'GREEN' : red.has(number) ? 'RED' : 'BLACK')
  const result = color && bet ? (color === bet ? 'WIN' : 'LOSS') : null
  useEffect(() => {
    if (result && !onSpin) onResolved(result)
  }, [result, onResolved, onSpin])
  const spin = () => {
    if (!bet || spinning) return
    setNumber(null)
    setSpinning(true)
    if (onSpin)
      void Promise.all([onSpin(bet), new Promise((resolve) => window.setTimeout(resolve, 2100))]).then(
        ([outcome]) => {
          setNumber(outcome.number)
          setServerColor(outcome.color)
          setSpinning(false)
          onServerResolved?.(outcome.result)
        },
      )
    else
      window.setTimeout(() => {
        setNumber(numbers[Math.floor(Math.random() * numbers.length)])
        setSpinning(false)
      }, 2100)
  }
  return (
    <div className="roulette-game">
      <div className={`roulette-wheel ${spinning ? 'is-spinning' : ''}`}>
        {numbers.map((value, index) => (
          <span
            key={value}
            className={`${value === 0 ? 'green' : red.has(value) ? 'red' : 'black'} ${number === value ? 'is-winning' : ''}`}
            style={{ transform: `rotate(${index * (360 / 37)}deg) translateY(-103px)` }}
          >
            {value}
          </span>
        ))}
        <i className={`roulette-hub ${number !== null ? 'is-result' : ''}`}>{number ?? '?'}</i>
      </div>
      <div className="roulette-bets">
        <button
          className={bet === 'RED' ? 'red is-selected' : 'red'}
          disabled={spinning || number !== null}
          onClick={() => setBet('RED')}
        >
          Czerwone
        </button>
        <button
          className={bet === 'BLACK' ? 'black is-selected' : 'black'}
          disabled={spinning || number !== null}
          onClick={() => setBet('BLACK')}
        >
          Czarne
        </button>
      </div>
      <button className="gamble-confirm" disabled={!bet || spinning || number !== null} onClick={spin}>
        {spinning ? 'Kręcimy…' : 'Zakręć'}
      </button>
    </div>
  )
}
