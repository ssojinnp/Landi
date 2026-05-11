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

const treeAssetSources: Partial<Record<PlantTemplate['kind'], string[]>> = {
  evergreen: ['/plant-assets/tree-conifer.png'],
  deciduous: ['/plant-assets/tree-broadleaf.png'],
  shrub: ['/plant-assets/tree-shrub.png'],
}

function getTreeAssetSrc(kind: PlantTemplate['kind'], variant: number) {
  const sources = treeAssetSources[kind]
  return sources?.[variant % sources.length] ?? null
}

function getRasterVariationStyle(variant: number) {
  const rotations = [-6, -2, 0, 3, 6, -8, 8]
  const hueRotations = [-5, 3, 0, 6, -8, 9, -3]
  const saturations = [102, 108, 98, 112, 104, 96, 110]
  const brightness = [98, 103, 100, 97, 104, 101, 99]
  return {
    filter: `hue-rotate(${hueRotations[variant]}deg) saturate(${saturations[variant]}%) brightness(${brightness[variant]}%) contrast(104%)`,
    transform: `rotate(${rotations[variant]}deg) scale(0.96)`,
  }
}

function RasterTreeSymbol({ assetSrc, boxHeight, boxWidth, center, radius, selected, variant }: { assetSrc: string; boxHeight: number; boxWidth: number; center: number; radius: number; selected: boolean; variant: number }) {
  const imageStyle = getRasterVariationStyle(variant)

  return (
    <span className="relative block" style={{ width: boxWidth, height: boxHeight }} aria-hidden="true">
      <img src={assetSrc} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-contain" style={imageStyle} />
      {selected && (
        <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="pointer-events-none absolute inset-0 overflow-visible">
          <SelectionRing center={center} radius={radius} />
        </svg>
      )}
    </span>
  )
}

export function PlantSymbol({ plant, selected = false }: PlantSymbolProps) {
  const { colors, id, kind, name, size } = plant
  const radius = size / 2
  const center = radius + 8
  const boxWidth = size + 16
  const boxHeight = size + 20
  const variant = getVariant(`${kind}-${id}-${name}`, 3)
  const rasterVariant = getVariant(`${id}-${name}-raster`, 7)
  const treeAssetSrc = getTreeAssetSrc(kind, rasterVariant)

  if (treeAssetSrc) {
    return <RasterTreeSymbol assetSrc={treeAssetSrc} boxHeight={boxHeight} boxWidth={boxWidth} center={center} radius={radius} selected={selected} variant={rasterVariant} />
  }

  if (kind === 'flower') {
    const bloomCenters = variant === 0
      ? [[0, -0.08, 0.24], [-0.28, 0.12, 0.2], [0.28, 0.1, 0.2]]
      : variant === 1
        ? [[-0.16, -0.16, 0.2], [0.18, -0.12, 0.22], [-0.28, 0.18, 0.18], [0.26, 0.18, 0.18]]
        : [[0, -0.2, 0.18], [-0.24, -0.02, 0.18], [0.24, -0.02, 0.18], [-0.16, 0.22, 0.16], [0.16, 0.22, 0.16]]
    return (
      <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="block overflow-visible" aria-hidden="true">
        <ellipse cx={center} cy={center + radius * 0.18} rx={radius * 0.82} ry={radius * 0.42} fill={colors.primary} opacity="0.38" />
        {[-0.42, -0.12, 0.18, 0.44].map((offset, index) => <ellipse key={index} cx={center + radius * offset} cy={center + radius * (0.26 + (index % 2) * 0.08)} rx={radius * 0.24} ry={radius * 0.12} fill={index % 2 === 0 ? colors.primary : colors.secondary} opacity="0.72" transform={`rotate(${offset * 28} ${center + radius * offset} ${center + radius * 0.28})`} />)}
        <path d={`M ${center - radius * 0.58} ${center + radius * 0.2} Q ${center - radius * 0.2} ${center - radius * 0.24} ${center + radius * 0.08} ${center + radius * 0.04} Q ${center + radius * 0.42} ${center - radius * 0.24} ${center + radius * 0.62} ${center + radius * 0.22}`} fill="none" stroke={colors.stroke} strokeWidth={Math.max(1.2, radius * 0.065)} strokeLinecap="round" opacity="0.5" />
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
                return <ellipse key={index} cx={cx} cy={cy} rx={radius * scale * 0.28} ry={radius * scale * 0.44} fill={colors.accent} opacity="0.98" transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`} />
              })}
              <circle cx={bloomCx} cy={bloomCy} r={radius * scale * 0.22} fill="#fff7bf" stroke="rgba(80,60,30,0.22)" strokeWidth="0.8" />
            </g>
          )
        })}
        <ellipse cx={center} cy={center + radius * 0.18} rx={radius * 0.74} ry={radius * 0.48} fill="none" stroke={colors.stroke} strokeWidth="1.4" opacity="0.36" />
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

  return null
}
