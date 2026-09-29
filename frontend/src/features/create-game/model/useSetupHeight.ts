import { useLayoutEffect, useRef } from 'react'

// Measure natural content, animate its wrapper; popups live outside this layout.
export function useSetupHeight() {
  const frameRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const frame = frameRef.current
    const content = contentRef.current
    if (!frame || !content) return
    const measure = () => {
      frame.style.height = `${content.getBoundingClientRect().height}px`
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])
  return { frameRef, contentRef }
}
