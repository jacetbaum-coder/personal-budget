import React, { useId, useRef, useState } from 'react'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  labels?: string[]
}

export default function Sparkline({ data, color = '#0f172a', height = 44, labels }: SparklineProps) {
  const id = useId()
  const ref = useRef<SVGSVGElement | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (!data || data.length === 0) return <svg className="w-full h-10" />

  const h = height
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const coords = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * 100
    const y = ((1 - (v - min) / range) * h)
    return { x, y, v }
  })

  const points = coords.map((p) => `${p.x},${p.y.toFixed(2)}`).join(' ')

  const areaPoints = `${coords.map((p) => `${p.x},${p.y.toFixed(2)}`).join(' ')} 100,${h} 0,${h}`

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const rx = e.clientX - box.left
    const pct = Math.max(0, Math.min(1, rx / box.width))
    const idx = Math.round(pct * (data.length - 1))
    setHoverIndex(idx)
  }

  function handleLeave() {
    setHoverIndex(null)
  }

  return (
    <svg
      ref={ref}
      viewBox={`0 0 100 ${h}`}
      preserveAspectRatio="none"
      className="w-full h-11"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <polygon points={areaPoints} fill={`url(#g-${id})`} />

      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ transition: 'stroke-width 160ms ease' }}
      />

      {/* markers */}
      {coords.map((p, i) => (
        <circle
          key={i}
          cx={`${p.x}%`}
          cy={p.y}
          r={i === hoverIndex ? 3.5 : 2}
          fill={i === hoverIndex ? '#fff' : color}
          stroke={i === hoverIndex ? color : 'none'}
          strokeWidth={1}
          opacity={i === hoverIndex ? 1 : 0.9}
        />
      ))}

      {/* hover tooltip */}
      {hoverIndex !== null && coords[hoverIndex] && (
        <g>
          <line
            x1={`${coords[hoverIndex].x}%`}
            x2={`${coords[hoverIndex].x}%`}
            y1={0}
            y2={h}
            stroke={color}
            strokeWidth={0.5}
            opacity={0.12}
          />

          <rect
            x={`${coords[hoverIndex].x}%`}
            y={Math.max(2, coords[hoverIndex].y - 22)}
            width={50}
            height={18}
            transform={`translate(-25,0)`}
            rx={6}
            fill="#0f172a"
            opacity={0.9}
          />
          <text
            x={`${coords[hoverIndex].x}%`}
            y={coords[hoverIndex].y - 8}
            textAnchor="middle"
            fontSize={9}
            fill="#fff"
          >
            {labels?.[hoverIndex] ?? coords[hoverIndex].v.toFixed(0)}
          </text>
        </g>
      )}
    </svg>
  )
}
