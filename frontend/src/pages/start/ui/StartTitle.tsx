import { useEffect, useState } from 'react'
import './StartTitle.css'

const title = 'La Cermika'

export function StartTitle() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let mounted = true
    const reveal = () => {
      if (mounted) setReady(true)
    }
    void document.fonts.load('italic 700 48px "Lobster Two"', title).then(reveal, reveal)
    return () => {
      mounted = false
    }
  }, [])

  return (
    <h1 className={`start-title ${ready ? 'start-title--ready' : ''}`} aria-label={title}>
      {title}
    </h1>
  )
}
