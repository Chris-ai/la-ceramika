import type { CSSProperties } from 'react'
import './ChallengeConfetti.css'

const colors = ['#ffd563', '#f28e9a', '#91abea', '#63cfc1', '#ad91d8']

export function ChallengeConfetti() {
  return (
    <div className="challenge-confetti" aria-hidden="true">
      {Array.from({ length: 72 }, (_, index) => (
        <i
          key={index}
          style={
            {
              '--x': `${(index * 37) % 101}%`,
              '--drift': `${((index * 53) % 241) - 120}px`,
              '--delay': `${(index % 12) * 0.045}s`,
              '--duration': `${2.2 + (index % 7) * 0.14}s`,
              '--spin': `${360 + (index % 5) * 180}deg`,
              backgroundColor: colors[index % colors.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
