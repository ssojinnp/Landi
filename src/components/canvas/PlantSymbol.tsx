// 식재 타입과 크기에 따라 2D 조감도용 SVG 심볼을 렌더링한다.
import type { PlantTemplate } from '../../types'

interface PlantSymbolProps {
  plant: Pick<PlantTemplate, 'colors' | 'kind' | 'size'>
  selected?: boolean
}

export function PlantSymbol({ plant, selected = false }: PlantSymbolProps) {
  const { colors, kind, size } = plant
  const radius = size / 2
  const center = radius + 8

  if (kind === 'flower') {
    const petalCount = 8
    return (
      <svg width={size + 16} height={size + 20} viewBox={`0 0 ${size + 16} ${size + 20}`} className="block overflow-visible" aria-hidden="true">
        <ellipse cx={center} cy={center + radius * 0.16} rx={radius * 0.7} ry={radius * 0.34} fill={colors.primary} opacity="0.32" />
        {Array.from({ length: petalCount }).map((_, index) => {
          const angle = (Math.PI * 2 * index) / petalCount
          const cx = center + Math.cos(angle) * radius * 0.42
          const cy = center + Math.sin(angle) * radius * 0.36
          return <ellipse key={index} cx={cx} cy={cy} rx={radius * 0.18} ry={radius * 0.28} fill={colors.accent} opacity="0.95" transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`} />
        })}
        <circle cx={center} cy={center} r={radius * 0.2} fill="#fff7bf" stroke="rgba(80,60,30,0.25)" strokeWidth="1" />
        <circle cx={center} cy={center} r={radius * 0.74} fill="none" stroke={colors.stroke} strokeWidth="1.4" opacity="0.3" />
        {selected && <rect x="3" y="3" width={size + 10} height={size + 10} fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="6 6" />}
      </svg>
    )
  }

  if (kind === 'groundcover') {
    return (
      <svg width={size + 16} height={size + 20} viewBox={`0 0 ${size + 16} ${size + 20}`} className="block overflow-visible" aria-hidden="true">
        <circle cx={center} cy={center} r={radius * 0.82} fill={colors.primary} opacity="0.24" />
        {Array.from({ length: 18 }).map((_, index) => {
          const angle = (Math.PI * 2 * index) / 18
          const start = radius * 0.12
          const end = radius * (0.56 + (index % 4) * 0.08)
          return <path key={index} d={`M ${center + Math.cos(angle) * start} ${center + Math.sin(angle) * start} Q ${center} ${center} ${center + Math.cos(angle) * end} ${center + Math.sin(angle) * end}`} fill="none" stroke={index % 2 === 0 ? colors.secondary : colors.stroke} strokeWidth="2" strokeLinecap="round" opacity="0.72" />
        })}
        {selected && <circle cx={center} cy={center} r={radius + 5} fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="6 6" />}
      </svg>
    )
  }

  const leafCount = kind === 'shrub' ? 10 : 14
  return (
    <svg width={size + 16} height={size + 20} viewBox={`0 0 ${size + 16} ${size + 20}`} className="block overflow-visible" aria-hidden="true">
      <circle cx={center} cy={center} r={radius * 0.94} fill={colors.primary} opacity="0.72" stroke={colors.stroke} strokeWidth="1.5" />
      {Array.from({ length: leafCount }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / leafCount
        const ring = index % 2 === 0 ? 0.5 : 0.72
        const cx = center + Math.cos(angle) * radius * ring
        const cy = center + Math.sin(angle) * radius * ring
        return <circle key={index} cx={cx} cy={cy} r={radius * (kind === 'shrub' ? 0.22 : 0.2)} fill={index % 3 === 0 ? colors.accent : colors.secondary} opacity="0.78" />
      })}
      <circle cx={center} cy={center} r={radius * 0.28} fill="none" stroke={colors.stroke} strokeWidth="1.2" opacity="0.45" />
      <circle cx={center} cy={center} r={radius * 0.64} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeDasharray="3 5" />
      {selected && <circle cx={center} cy={center} r={radius + 5} fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="6 6" />}
    </svg>
  )
}
