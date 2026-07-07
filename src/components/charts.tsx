import { useRef, useState } from 'react'

type Point = [number, number]

// Catmull-Rom -> Bezier para una curva suave que pasa por los puntos
function smoothPath(points: Point[]): string {
  if (points.length < 2) return ''
  const d = [`M ${points[0][0]} ${points[0][1]}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`)
  }
  return d.join(' ')
}

export function formatShort(n: number): string {
  if (n >= 1000) return `Q${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return `Q${Math.round(n)}`
}

// ── Sparkline ────────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  fillOpacity?: number
}

export function Sparkline({ data, color = 'var(--accent)', height = 38, fillOpacity = 0.18 }: SparklineProps) {
  const w = 100
  const h = height
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts: Point[] = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 4 - ((v - min) / range) * (h - 8),
  ])
  const d = smoothPath(pts)
  const dFill = `${d} L ${w} ${h} L 0 ${h} Z`
  const gid = `sg-${Math.random().toString(36).slice(2, 9)}`
  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={dFill} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  )
}

// ── AreaChart ────────────────────────────────────────────────────────────────

export interface AreaPoint {
  label: string
  current: number
  previous: number
}

interface AreaChartProps {
  data: AreaPoint[]
  height?: number
  accent?: string
  secondary?: string
}

export function AreaChart({ data, height = 240, accent = 'var(--accent)', secondary = 'var(--info)' }: AreaChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 800
  const H = height
  const padL = 40
  const padR = 12
  const padT = 16
  const padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  if (!data || data.length === 0) return null

  const allValues = data.flatMap((d) => [d.current, d.previous])
  const maxV = Math.max(...allValues) * 1.15
  const minV = 0
  const range = maxV - minV || 1

  const xOf = (i: number) => padL + (i / (data.length - 1)) * innerW
  const yOf = (v: number) => padT + innerH - ((v - minV) / range) * innerH

  const ptsCur: Point[] = data.map((d, i) => [xOf(i), yOf(d.current)])
  const ptsPrev: Point[] = data.map((d, i) => [xOf(i), yOf(d.previous)])
  const dCur = smoothPath(ptsCur)
  const dPrev = smoothPath(ptsPrev)
  const dCurFill = `${dCur} L ${xOf(data.length - 1)} ${padT + innerH} L ${xOf(0)} ${padT + innerH} Z`

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = minV + range * t
    return { v, y: yOf(v), label: formatShort(v) }
  })

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    // Convertir la posición del mouse a coordenadas reales del viewBox usando la
    // matriz del SVG. Así se respeta el escalado/centrado (preserveAspectRatio) y
    // el índice detectado coincide exactamente con el punto bajo el cursor.
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const loc = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const i = Math.round(((loc.x - padL) / innerW) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="ac-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="var(--chart-grid)" strokeWidth="1" />
            <text x={padL - 8} y={t.y} dy="0.32em" textAnchor="end" fill="var(--text-faint)" fontSize="10.5" fontFamily="Geist Mono">
              {t.label}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 8))
          if (i % step !== 0 && i !== data.length - 1) return null
          return (
            <text key={i} x={xOf(i)} y={H - 8} textAnchor="middle" fill="var(--text-faint)" fontSize="10.5">
              {d.label}
            </text>
          )
        })}
        <path d={dPrev} fill="none" stroke={secondary} strokeWidth="1.4" strokeDasharray="3 3" opacity="0.55" />
        <path d={dCurFill} fill="url(#ac-fill)" />
        <path d={dCur} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        {hover != null && (
          <g>
            <line x1={xOf(hover)} x2={xOf(hover)} y1={padT} y2={padT + innerH} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={xOf(hover)} cy={yOf(data[hover].previous)} r="3.5" fill="var(--bg-elev-1)" stroke={secondary} strokeWidth="1.5" />
            <circle cx={xOf(hover)} cy={yOf(data[hover].current)} r="4" fill="var(--bg-elev-1)" stroke={accent} strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover != null && (
        <div
          style={{
            position: 'absolute',
            left: `${(xOf(hover) / W) * 100}%`,
            top: 8,
            transform: 'translateX(-50%)',
            background: 'var(--bg-elev-1)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11.5,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,.12)',
            whiteSpace: 'nowrap',
            zIndex: 5,
          }}
        >
          <div style={{ color: 'var(--text-faint)', marginBottom: 4, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {data[hover].label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: accent, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)' }}>Actual</span>
            <span style={{ marginLeft: 'auto', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              Q {data[hover].current.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: secondary, display: 'inline-block', opacity: 0.6 }} />
            <span style={{ color: 'var(--text-muted)' }}>Anterior</span>
            <span style={{ marginLeft: 'auto', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              Q {data[hover].previous.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Donut ────────────────────────────────────────────────────────────────────

export interface DonutSegment {
  label: string
  value: number
  color: string
}

interface DonutProps {
  segments: DonutSegment[]
  size?: number
  thickness?: number
}

export function Donut({ segments, size = 168, thickness = 22 }: DonutProps) {
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const total = segments.reduce((s, x) => s + x.value, 0)
  const C = 2 * Math.PI * r
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elev-2)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const frac = s.value / total
        const len = frac * C
        const offset = -acc
        acc += len
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )
      })}
    </svg>
  )
}
