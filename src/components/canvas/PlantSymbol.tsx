// 식재 타입과 크기에 따라 2D 조감도용 SVG 심볼을 렌더링한다.
import type { PlantTemplate } from '../../types'

interface PlantSymbolProps {
  plant: Pick<PlantTemplate, 'colors' | 'id' | 'kind' | 'name' | 'size'>
  selected?: boolean
}

function getVariant(seed: string, count: number) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  return hash % count
}

function SelectionRing({ center, radius }: { center: number; radius: number }) {
  return <circle cx={center} cy={center} r={radius + 5} fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="6 6" />
}

export function PlantSymbol({ plant, selected = false }: PlantSymbolProps) {
  const { colors, id, kind, name, size } = plant
  const radius = size / 2
  const center = radius + 8
  const boxWidth = size + 16
  const boxHeight = size + 20
  const variant = getVariant(`${kind}-${id}-${name}`, 3)

  if (kind === 'flower') {
    const bloomCenters = variant === 0
      ? [[0, -0.08, 0.24], [-0.28, 0.12, 0.2], [0.28, 0.1, 0.2]]
      : variant === 1
        ? [[-0.16, -0.16, 0.2], [0.18, -0.12, 0.22], [-0.28, 0.18, 0.18], [0.26, 0.18, 0.18]]
        : [[0, -0.2, 0.18], [-0.24, -0.02, 0.18], [0.24, -0.02, 0.18], [-0.16, 0.22, 0.16], [0.16, 0.22, 0.16]]
    return (
      <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="block overflow-visible" aria-hidden="true">
        <ellipse cx={center} cy={center + radius * 0.18} rx={radius * 0.82} ry={radius * 0.42} fill={colors.primary} opacity="0.26" />
        {[-0.42, -0.12, 0.18, 0.44].map((offset, index) => <ellipse key={index} cx={center + radius * offset} cy={center + radius * (0.26 + (index % 2) * 0.08)} rx={radius * 0.24} ry={radius * 0.12} fill={index % 2 === 0 ? colors.primary : colors.secondary} opacity="0.56" transform={`rotate(${offset * 28} ${center + radius * offset} ${center + radius * 0.28})`} />)}
        <path d={`M ${center - radius * 0.58} ${center + radius * 0.2} Q ${center - radius * 0.2} ${center - radius * 0.24} ${center + radius * 0.08} ${center + radius * 0.04} Q ${center + radius * 0.42} ${center - radius * 0.24} ${center + radius * 0.62} ${center + radius * 0.22}`} fill="none" stroke={colors.stroke} strokeWidth={Math.max(1, radius * 0.055)} strokeLinecap="round" opacity="0.36" />
        {bloomCenters.map(([x, y, scale], bloomIndex) => {
          const bloomCx = center + radius * x
          const bloomCy = center + radius * y
          const petalCount = bloomIndex % 2 === 0 ? 5 : 6
          return (
            <g key={bloomIndex}>
              {Array.from({ length: petalCount }).map((_, index) => {
                const angle = (Math.PI * 2 * index) / petalCount
                const cx = bloomCx + Math.cos(angle) * radius * scale * 0.42
                const cy = bloomCy + Math.sin(angle) * radius * scale * 0.38
                return <ellipse key={index} cx={cx} cy={cy} rx={radius * scale * 0.28} ry={radius * scale * 0.44} fill={colors.accent} opacity="0.92" transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`} />
              })}
              <circle cx={bloomCx} cy={bloomCy} r={radius * scale * 0.22} fill="#fff7bf" stroke="rgba(80,60,30,0.22)" strokeWidth="0.8" />
            </g>
          )
        })}
        <ellipse cx={center} cy={center + radius * 0.18} rx={radius * 0.74} ry={radius * 0.48} fill="none" stroke={colors.stroke} strokeWidth="1.2" opacity="0.22" />
        {selected && <SelectionRing center={center} radius={radius} />}
      </svg>
    )
  }

  if (kind === 'groundcover') {
    const bladeCount = variant === 0 ? 19 : variant === 1 ? 21 : 23
    const bases = variant === 0 ? [-0.38, -0.18, 0, 0.2, 0.4] : variant === 1 ? [-0.44, -0.24, -0.04, 0.18, 0.38, 0.5] : [-0.42, -0.22, -0.06, 0.12, 0.3, 0.46]
    return (
      <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="block overflow-visible" aria-hidden="true">
        <path d={`M ${center - radius * 0.78} ${center + radius * 0.42} C ${center - radius * 0.48} ${center + radius * 0.78} ${center + radius * 0.54} ${center + radius * 0.78} ${center + radius * 0.82} ${center + radius * 0.38}`} fill={colors.primary} opacity="0.18" />
        {Array.from({ length: bladeCount }).map((_, index) => {
          const angle = -Math.PI * 0.88 + (Math.PI * 1.76 * index) / (bladeCount - 1)
          const length = radius * (0.5 + (index % 6) * 0.075)
          const baseOffset = bases[index % bases.length] * radius
          const baseX = center + baseOffset
          const baseY = center + radius * (0.42 + (index % 2) * 0.06)
          const bend = (index % 2 === 0 ? -1 : 1) * radius * (0.16 + (index % 3) * 0.04)
          const tipX = baseX + Math.cos(angle) * length
          const tipY = baseY + Math.sin(angle) * length * 0.7
          return <path key={index} d={`M ${baseX} ${baseY} Q ${baseX + Math.cos(angle) * radius * 0.24 + bend} ${center + Math.sin(angle) * radius * 0.24} ${tipX} ${tipY}`} fill="none" stroke={index % 4 === 0 ? colors.stroke : index % 2 === 0 ? colors.primary : colors.secondary} strokeWidth={Math.max(1.7, radius * 0.08)} strokeLinecap="round" opacity="0.88" />
        })}
        {Array.from({ length: 8 }).map((_, index) => {
          const angle = -Math.PI * 0.72 + (Math.PI * 1.44 * index) / 7
          const baseX = center + radius * (-0.28 + index * 0.08)
          const baseY = center + radius * 0.52
          const tipX = baseX + Math.cos(angle) * radius * 0.38
          const tipY = baseY + Math.sin(angle) * radius * 0.42
          return <path key={index} d={`M ${baseX} ${baseY} Q ${center} ${center + radius * 0.18} ${tipX} ${tipY}`} fill="none" stroke={colors.accent} strokeWidth={Math.max(1.3, radius * 0.055)} strokeLinecap="round" opacity="0.72" />
        })}
        {bases.map((offset, index) => <ellipse key={index} cx={center + radius * offset} cy={center + radius * 0.48} rx={radius * 0.18} ry={radius * 0.09} fill={colors.stroke} opacity="0.16" />)}
        {selected && <SelectionRing center={center} radius={radius} />}
      </svg>
    )
  }

  if (kind === 'evergreen') {
    const branchCount = variant === 0 ? 12 : variant === 1 ? 14 : 16
    const canopyLobes = variant === 0
      ? [[0, -0.2, 0.42, 0.28], [-0.32, 0.04, 0.34, 0.24], [0.28, 0.02, 0.38, 0.25], [-0.12, 0.28, 0.36, 0.23], [0.2, 0.3, 0.3, 0.2]]
      : variant === 1
        ? [[-0.2, -0.26, 0.36, 0.25], [0.22, -0.2, 0.4, 0.27], [-0.42, 0.08, 0.3, 0.22], [0.38, 0.12, 0.34, 0.23], [0.02, 0.28, 0.38, 0.24]]
        : [[0, -0.32, 0.34, 0.23], [-0.34, -0.06, 0.32, 0.23], [0.34, -0.04, 0.34, 0.23], [-0.18, 0.24, 0.34, 0.22], [0.22, 0.26, 0.32, 0.21], [0.02, 0.02, 0.3, 0.2]]
    return (
      <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="block overflow-visible" aria-hidden="true">
        <path d={`M ${center - radius * 0.82} ${center + radius * 0.2} C ${center - radius * 0.58} ${center - radius * 0.62} ${center + radius * 0.6} ${center - radius * 0.66} ${center + radius * 0.82} ${center + radius * 0.18} C ${center + radius * 0.52} ${center + radius * 0.72} ${center - radius * 0.48} ${center + radius * 0.76} ${center - radius * 0.82} ${center + radius * 0.2} Z`} fill={colors.primary} opacity="0.22" />
        {Array.from({ length: branchCount }).map((_, index) => {
          const angle = (Math.PI * 2 * index) / branchCount + (variant * Math.PI) / 18
          const outer = radius * (0.58 + (index % 4) * 0.07)
          const x2 = center + Math.cos(angle) * outer
          const y2 = center + Math.sin(angle) * outer
          const sideAngle = angle + Math.PI / 2
          const width = radius * (0.1 + (index % 2) * 0.025)
          const p1 = `${center + Math.cos(angle) * radius * 0.12},${center + Math.sin(angle) * radius * 0.12}`
          const p2 = `${x2 + Math.cos(sideAngle) * width},${y2 + Math.sin(sideAngle) * width}`
          const p3 = `${x2 - Math.cos(sideAngle) * width},${y2 - Math.sin(sideAngle) * width}`
          return <polygon key={index} points={`${p1} ${p2} ${p3}`} fill={index % 3 === 0 ? colors.accent : index % 2 === 0 ? colors.secondary : colors.primary} stroke={colors.stroke} strokeWidth="0.6" opacity="0.72" />
        })}
        {canopyLobes.map(([x, y, rx, ry], index) => <ellipse key={index} cx={center + radius * x} cy={center + radius * y} rx={radius * rx} ry={radius * ry} fill={index % 2 === 0 ? colors.primary : colors.secondary} stroke={colors.stroke} strokeWidth="1" opacity="0.68" transform={`rotate(${index % 2 === 0 ? -18 : 16} ${center + radius * x} ${center + radius * y})`} />)}
        {Array.from({ length: 7 }).map((_, index) => {
          const angle = (Math.PI * 2 * index) / 7 + Math.PI / 9
          return <path key={index} d={`M ${center} ${center} Q ${center + Math.cos(angle) * radius * 0.24} ${center + Math.sin(angle) * radius * 0.12} ${center + Math.cos(angle) * radius * 0.48} ${center + Math.sin(angle) * radius * 0.36}`} stroke={colors.stroke} strokeWidth={Math.max(1, radius * 0.045)} strokeLinecap="round" fill="none" opacity="0.42" />
        })}
        <circle cx={center} cy={center} r={radius * 0.13} fill={colors.stroke} opacity="0.38" />
        <path d={`M ${center - radius * 0.44} ${center + radius * 0.12} C ${center - radius * 0.18} ${center + radius * 0.34} ${center + radius * 0.24} ${center + radius * 0.34} ${center + radius * 0.48} ${center + radius * 0.1}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 4" />
        {selected && <SelectionRing center={center} radius={radius} />}
      </svg>
    )
  }

  if (kind === 'shrub') {
    const clumps = [
      [-0.44, 0.02, 0.28],
      [-0.2, -0.12, 0.34],
      [0.08, -0.08, 0.36],
      [0.36, 0.02, 0.3],
      [-0.34, 0.26, 0.26],
      [0.24, 0.28, 0.28],
    ]
    return (
      <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="block overflow-visible" aria-hidden="true">
        <ellipse cx={center} cy={center + radius * 0.2} rx={radius * 0.98} ry={radius * 0.52} fill={colors.primary} opacity="0.2" />
        <path d={`M ${center - radius * 0.74} ${center + radius * 0.34} C ${center - radius * 0.42} ${center + radius * 0.64} ${center + radius * 0.42} ${center + radius * 0.64} ${center + radius * 0.76} ${center + radius * 0.3}`} fill="none" stroke={colors.stroke} strokeWidth={Math.max(1.4, radius * 0.055)} strokeLinecap="round" opacity="0.26" />
        {clumps.map(([x, y, r], index) => <ellipse key={index} cx={center + radius * x} cy={center + radius * y} rx={radius * r * 1.08} ry={radius * r * 0.78} fill={index % 2 === 0 ? colors.primary : colors.secondary} stroke={colors.stroke} strokeWidth="1" opacity="0.78" />)}
        {Array.from({ length: 12 }).map((_, index) => {
          const x = center + radius * (-0.58 + index * 0.105)
          const y = center + radius * (0.02 + (index % 3) * 0.1)
          return <circle key={index} cx={x} cy={y} r={radius * 0.05} fill={colors.accent} opacity="0.76" />
        })}
        <ellipse cx={center} cy={center + radius * 0.12} rx={radius * 0.86} ry={radius * 0.48} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeDasharray="2 4" />
        {selected && <SelectionRing center={center} radius={radius} />}
      </svg>
    )
  }

  const leafCount = variant === 0 ? 9 : variant === 1 ? 11 : 13
  const canopyClumps = variant === 0
    ? [[0, -0.2, 0.38], [-0.34, 0, 0.34], [0.32, 0, 0.36], [-0.1, 0.28, 0.34], [0.22, 0.28, 0.3]]
    : variant === 1
      ? [[-0.24, -0.28, 0.34], [0.2, -0.24, 0.38], [-0.42, 0.1, 0.3], [0.44, 0.08, 0.34], [0.02, 0.24, 0.38]]
      : [[0, -0.34, 0.3], [-0.34, -0.08, 0.3], [0.34, -0.08, 0.3], [-0.2, 0.24, 0.32], [0.24, 0.24, 0.32], [0, 0.02, 0.34]]
  return (
    <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="block overflow-visible" aria-hidden="true">
      {canopyClumps.map(([x, y, r], index) => <circle key={index} cx={center + radius * x} cy={center + radius * y} r={radius * r} fill={index % 2 === 0 ? colors.primary : colors.secondary} stroke={colors.stroke} strokeWidth="1.1" opacity="0.7" />)}
      {Array.from({ length: 6 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 6 + Math.PI / 10
        return <path key={index} d={`M ${center} ${center} Q ${center + Math.cos(angle) * radius * 0.24} ${center + Math.sin(angle) * radius * 0.18} ${center + Math.cos(angle) * radius * 0.46} ${center + Math.sin(angle) * radius * 0.38}`} stroke={colors.stroke} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.34" />
      })}
      {Array.from({ length: leafCount }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / leafCount
        const ring = index % 2 === 0 ? 0.34 : 0.58
        const cx = center + Math.cos(angle) * radius * ring
        const cy = center + Math.sin(angle) * radius * ring * 0.86
        const rx = radius * (variant === 1 ? 0.18 : 0.2)
        const ry = radius * (variant === 2 ? 0.27 : 0.22)
        return <ellipse key={index} cx={cx} cy={cy} rx={rx} ry={ry} fill={index % 3 === 0 ? colors.accent : colors.secondary} opacity="0.78" transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`} />
      })}
      {Array.from({ length: 5 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 5 + Math.PI / 8
        return <path key={index} d={`M ${center} ${center} L ${center + Math.cos(angle) * radius * 0.42} ${center + Math.sin(angle) * radius * 0.36}`} stroke={colors.stroke} strokeWidth="1.1" strokeLinecap="round" opacity="0.28" />
      })}
      <circle cx={center} cy={center} r={radius * 0.16} fill={colors.stroke} opacity="0.35" />
      <circle cx={center} cy={center} r={radius * 0.62} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeDasharray="3 5" />
      {selected && <SelectionRing center={center} radius={radius} />}
    </svg>
  )
}
