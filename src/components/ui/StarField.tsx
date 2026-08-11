import { useRef } from 'react'

type Star = { id: number; x: number; y: number; size: number; dur: number; delay: number }

export default function StarField({ count = 80 }: { count?: number }) {
  const stars = useRef<Star[]>(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      dur: 2 + Math.random() * 4,
      delay: Math.random() * 4,
    })),
  )
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.current.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            opacity: 0.4,
            '--dur': `${s.dur}s`,
            '--delay': `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}