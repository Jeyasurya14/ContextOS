'use client'

import { useEffect, useRef, useState } from 'react'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}

/**
 * Spring-eased number count-up. Used for KPI tiles.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  format = fmt,
  className,
  style,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
  style?: React.CSSProperties
}) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startValRef = useRef(0)

  useEffect(() => {
    const from = startValRef.current
    const to = value
    const t0 = performance.now()

    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      // easeOutExpo for a classy settle
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      const current = from + (to - from) * eased
      setDisplay(current)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else startValRef.current = to
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return <span className={className} style={style}>{format(display)}</span>
}
