import { useEffect, useState } from 'react'
import { advanceDemoGame, createDemoGame } from '../lib/demoGame'

export function useDemoGame() {
  const [game, setGame] = useState(() => createDemoGame())
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setTimeout> | undefined
    let current = createDemoGame()
    let resetting = false
    const schedule = () => {
      clearTimeout(timer)
      if (motion.matches || document.hidden) return
      timer = setTimeout(
        () => {
          if (resetting) {
            current = createDemoGame(current.seed + 1)
            resetting = false
            setFading(false)
            setGame(current)
          } else if (current.finished) {
            resetting = true
            setFading(true)
          } else {
            current = advanceDemoGame(current)
            setGame(current)
          }
          schedule()
        },
        resetting ? 650 : current.finished ? 2600 : 1250,
      )
    }
    schedule()
    motion.addEventListener('change', schedule)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      clearTimeout(timer)
      motion.removeEventListener('change', schedule)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [])

  return { game, fading }
}
