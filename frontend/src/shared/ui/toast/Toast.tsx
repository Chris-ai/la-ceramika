import { useEffect, useEffectEvent } from 'react'
import './Toast.css'

export function Toast({
  message,
  tone = 'success',
  onDismiss,
}: {
  message: string
  tone?: 'success' | 'error'
  onDismiss(): void
}) {
  const dismiss = useEffectEvent(onDismiss)
  useEffect(() => {
    const timeout = window.setTimeout(() => dismiss(), 3000)
    return () => window.clearTimeout(timeout)
  }, [message])

  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
