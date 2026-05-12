// 식재 타입과 크기에 따라 2D 조감도용 SVG 심볼을 렌더링한다.
import type { PlantTemplate } from '../../types'

interface PlantSymbolProps {
  plant: Pick<PlantTemplate, 'assetVariant' | 'colors' | 'id' | 'kind' | 'name' | 'size' | 'toneVariant'>
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

type PlantAssetSource = string | { src: string; maskSrc?: string }

const plantAssetSources: Partial<Record<PlantTemplate['kind'], PlantAssetSource[]>> = {
  evergreen: [
    '/plant-assets/tree-conifer.png',
    '/plant-assets/tree-conifer-01.png',
    '/plant-assets/tree-conifer-02.png',
  ],
  deciduous: [
    '/plant-assets/tree-broadleaf.png',
    '/plant-assets/tree-canopy-01.png',
    '/plant-assets/tree-canopy-02.png',
    '/plant-assets/tree-canopy-03.png',
  ],
  shrub: [
    '/plant-assets/tree-shrub.png',
    '/plant-assets/shrub-01.png',
    '/plant-assets/shrub-02.png',
    '/plant-assets/shrub-flower-01.png',
    '/plant-assets/shrub-variegated-01.png',
  ],
  groundcover: [
    '/plant-assets/plant-groundcover.png',
    '/plant-assets/groundcover-01.png',
    '/plant-assets/groundcover-02.png',
    '/plant-assets/groundcover-tuft-01.png',
    '/plant-assets/groundcover-broadleaf-01.png',
  ],
  flower: [
    { src: '/plant-assets/flower-bed-01-base.png', maskSrc: '/plant-assets/flower-bed-01-mask.png' },
    { src: '/plant-assets/flower-bed-02-base.png', maskSrc: '/plant-assets/flower-bed-02-mask.png' },
  ],
}

const fallbackPlantAssetSources: Record<PlantTemplate['kind'], string> = {
  evergreen: '/plant-assets/tree-conifer.png',
  deciduous: '/plant-assets/tree-broadleaf.png',
  shrub: '/plant-assets/tree-shrub.png',
  groundcover: '/plant-assets/plant-groundcover.png',
  flower: '/plant-assets/flower-bed-01-base.png',
}

function getPlantAssetSource(kind: PlantTemplate['kind'], variant: number) {
  const sources = plantAssetSources[kind]
  return sources?.[variant % sources.length] ?? null
}

function getFallbackPlantAssetSrc(kind: PlantTemplate['kind']) {
  return fallbackPlantAssetSources[kind]
}

function getRasterVariationStyle(kind: PlantTemplate['kind'], variant: number) {
  const treeScaleX = [1, 1.02, 0.98, 1.01, 0.99, 1.025, 0.975]
  const treeScaleY = [1, 0.99, 1.015, 0.995, 1.01, 0.985, 1.02]
  const shrubScaleX = [1.08, 1.12, 1.06, 1.1, 1.07, 1.13, 1.05]
  const shrubScaleY = [0.88, 0.84, 0.9, 0.86, 0.89, 0.83, 0.91]
  const groundcoverScaleX = [1, 1.01, 0.99, 1.005, 0.995, 1.015, 0.985]
  const groundcoverScaleY = [1, 0.995, 1.005, 1, 1.01, 0.99, 1.005]
  const scaleX = kind === 'shrub' ? shrubScaleX : kind === 'groundcover' ? groundcoverScaleX : treeScaleX
  const scaleY = kind === 'shrub' ? shrubScaleY : kind === 'groundcover' ? groundcoverScaleY : treeScaleY
  const shiftX = [0, -0.5, 0.5, 0, 0.5, -0.5, 0]
  const shiftY = [0, 0.5, -0.5, 0, -0.5, 0.5, 0]
  return {
    transform: `translate(${shiftX[variant]}%, ${shiftY[variant]}%) scale(${scaleX[variant]}, ${scaleY[variant]})`,
    transformOrigin: '50% 50%',
  }
}

function getRasterToneFilter(kind: PlantTemplate['kind'], colors: PlantTemplate['colors'], variant: number, toneVariant?: number) {
  const colorSeed = getVariant(`${colors.primary}-${colors.secondary}-${colors.accent}`, 13)
  const resolvedToneVariant = toneVariant ?? (variant + colorSeed) % 13
  const hue = [-14, -8, -4, 0, 5, 9, 14, -18, 18, -11, 11, 3, -3][resolvedToneVariant]
  const saturation = [102, 108, 96, 112, 118, 92, 106, 122, 98, 114, 104, 110, 94][resolvedToneVariant]
  const brightness = [100, 104, 97, 101, 106, 95, 99, 103, 98, 105, 96, 102, 100][resolvedToneVariant]
  const contrast = kind === 'groundcover' ? 104 : kind === 'shrub' ? 106 : 103

  return `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`
}

function getFlowerColorVariant(accentColor: string) {
  const normalizedColor = accentColor.toLowerCase()
  const colorOrder = ['#f28ab2', '#b78cf0', '#7fb7f2', '#f1d65c', '#e85f5c', '#f8f4df']
  const colorIndex = colorOrder.indexOf(normalizedColor)
  return colorIndex >= 0 ? colorIndex : getVariant(normalizedColor, colorOrder.length)
}

function getFlowerRasterVariation(colorVariant: number, shapeVariant: number) {
  const scaleX = [1, 1.045, 0.965, 1.025, 0.985, 1.06, 0.955, 1.035, 0.975]
  const scaleY = [1, 0.985, 1.035, 1.015, 1.005, 0.97, 1.045, 0.995, 1.025]
  const shiftX = [0, -1, 0.5, 1, -0.5, 0, 1, -1, 0.5]
  const shiftY = [0, 0.5, -0.5, 0, 0.5, -0.5, 1, 0, -1]
  const fullness = [0.72, 0.66, 0.78, 0.7, 0.62, 0.76, 0.68, 0.8, 0.7]
  const variant = (colorVariant * 2 + shapeVariant) % scaleX.length
  const baseTransform = `translate(${shiftX[variant]}%, ${shiftY[variant]}%) scale(${scaleX[variant]}, ${scaleY[variant]})`
  return {
    baseTransform,
    fullness: fullness[variant],
    layerTransforms: [
      baseTransform,
      `translate(${shiftX[variant] - 2}%, ${shiftY[variant] + 0.5}%) scale(${scaleX[variant] * 0.72}, ${scaleY[variant] * 0.72})`,
      `translate(${shiftX[variant] + 2}%, ${shiftY[variant] - 1}%) scale(${scaleX[variant] * 0.62}, ${scaleY[variant] * 0.64})`,
    ],
  }
}

function RasterPlantSymbol({ assetSrc, boxHeight, boxWidth, center, colors, fallbackAssetSrc, kind, maskSrc, radius, selected, toneVariant, variant }: { assetSrc: string; boxHeight: number; boxWidth: number; center: number; colors: PlantTemplate['colors']; fallbackAssetSrc: string; kind: PlantTemplate['kind']; maskSrc?: string; radius: number; selected: boolean; toneVariant?: number; variant: number }) {
  const flowerVariation = kind === 'flower' ? getFlowerRasterVariation(getFlowerColorVariant(colors.accent), variant % 3) : null
  const imageStyle = flowerVariation
    ? { transform: flowerVariation.baseTransform, transformOrigin: '50% 50%' }
    : getRasterVariationStyle(kind, variant)
  const imageFilter = kind === 'flower' ? 'none' : getRasterToneFilter(kind, colors, variant, toneVariant)
  const flowerMaskStyle = {
    backgroundColor: colors.accent,
    maskImage: `url(${maskSrc ?? '/plant-assets/plant-flower-mask.png'})`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
    WebkitMaskImage: `url(${maskSrc ?? '/plant-assets/plant-flower-mask.png'})`,
    WebkitMaskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: 'contain',
  }

  return (
    <span className="relative block" style={{ width: boxWidth, height: boxHeight }} aria-hidden="true">
      <span className="pointer-events-none absolute left-1/2 top-[76%] h-[12%] w-[54%] -translate-x-1/2 rounded-full bg-slate-900/18 blur-[3px]" />
      <img
        src={assetSrc}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        style={{ ...imageStyle, filter: imageFilter }}
        onError={(event) => {
          if (event.currentTarget.src.endsWith(fallbackAssetSrc)) return
          event.currentTarget.src = fallbackAssetSrc
        }}
      />
      {flowerVariation && (
        <>
          {flowerVariation.layerTransforms.map((transform, index) => (
            <span
              key={transform}
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{
                ...flowerMaskStyle,
                opacity: index === 0 ? 0.96 : flowerVariation.fullness - index * 0.16,
                transform,
                transformOrigin: '50% 50%',
              }}
            />
          ))}
        </>
      )}
      {selected && (
        <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="pointer-events-none absolute inset-0 overflow-visible">
          <SelectionRing center={center} radius={radius} />
        </svg>
      )}
    </span>
  )
}

export function PlantSymbol({ plant, selected = false }: PlantSymbolProps) {
  const { assetVariant, colors, id, kind, name, size, toneVariant } = plant
  const radius = size / 2
  const center = radius + 8
  const boxWidth = size + 16
  const boxHeight = size + 20
  const variant = getVariant(`${kind}-${id}-${name}`, 3)
  const rasterVariant = assetVariant ?? getVariant(`${id}-${name}-raster`, 7)
  const plantAssetSource = getPlantAssetSource(kind, rasterVariant)

  if (plantAssetSource) {
    const assetSrc = typeof plantAssetSource === 'string' ? plantAssetSource : plantAssetSource.src
    const maskSrc = typeof plantAssetSource === 'string' ? undefined : plantAssetSource.maskSrc
    return <RasterPlantSymbol assetSrc={assetSrc} boxHeight={boxHeight} boxWidth={boxWidth} center={center} colors={colors} fallbackAssetSrc={getFallbackPlantAssetSrc(kind)} kind={kind} maskSrc={maskSrc} radius={radius} selected={selected} toneVariant={toneVariant} variant={rasterVariant} />
  }

  if (kind === 'flower') {
    const flowerVariant = getVariant(`${id}-${name}-flower`, 5)
    const bloomCenters = variant === 0
      ? [[0, -0.08, 0.24], [-0.28, 0.12, 0.2], [0.28, 0.1, 0.2]]
      : variant === 1
        ? [[-0.16, -0.16, 0.2], [0.18, -0.12, 0.22], [-0.28, 0.18, 0.18], [0.26, 0.18, 0.18]]
        : [[0, -0.2, 0.18], [-0.24, -0.02, 0.18], [0.24, -0.02, 0.18], [-0.16, 0.22, 0.16], [0.16, 0.22, 0.16]]
    const flowerScaleX = [1, 1.04, 0.97, 1.02, 0.99][flowerVariant]
    const flowerScaleY = [1, 0.99, 1.03, 1.01, 1.02][flowerVariant]
    return (
      <svg width={boxWidth} height={boxHeight} viewBox={`0 0 ${boxWidth} ${boxHeight}`} className="block overflow-visible" aria-hidden="true">
        <g transform={`scale(${flowerScaleX} ${flowerScaleY})`} style={{ transformOrigin: `${center}px ${center}px` }}>
          <ellipse cx={center} cy={center + radius * 0.18} rx={radius * 0.82} ry={radius * 0.42} fill={colors.primary} opacity="0.38" />
          {[-0.42, -0.12, 0.18, 0.44].map((offset, index) => <ellipse key={index} cx={center + radius * offset} cy={center + radius * (0.26 + (index % 2) * 0.08)} rx={radius * (0.2 + flowerVariant * 0.012)} ry={radius * 0.12} fill={index % 2 === 0 ? colors.primary : colors.secondary} opacity="0.72" transform={`rotate(${offset * 28} ${center + radius * offset} ${center + radius * 0.28})`} />)}
          <path d={`M ${center - radius * 0.58} ${center + radius * 0.2} Q ${center - radius * 0.2} ${center - radius * 0.24} ${center + radius * 0.08} ${center + radius * 0.04} Q ${center + radius * 0.42} ${center - radius * 0.24} ${center + radius * 0.62} ${center + radius * 0.22}`} fill="none" stroke={colors.stroke} strokeWidth={Math.max(1.2, radius * 0.065)} strokeLinecap="round" opacity="0.5" />
          {bloomCenters.map(([x, y, scale], bloomIndex) => {
            const bloomCx = center + radius * x
            const bloomCy = center + radius * y
            const petalCount = bloomIndex % 2 === 0 ? 5 + (flowerVariant % 2) : 6
            return (
              <g key={bloomIndex}>
                {Array.from({ length: petalCount }).map((_, index) => {
                  const angle = (Math.PI * 2 * index) / petalCount
                  const cx = bloomCx + Math.cos(angle) * radius * scale * 0.42
                  const cy = bloomCy + Math.sin(angle) * radius * scale * 0.38
                  return <ellipse key={index} cx={cx} cy={cy} rx={radius * scale * 0.28} ry={radius * scale * (0.38 + flowerVariant * 0.015)} fill={colors.accent} opacity="0.98" transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`} />
                })}
                <circle cx={bloomCx} cy={bloomCy} r={radius * scale * 0.22} fill="#fff7bf" stroke="rgba(80,60,30,0.22)" strokeWidth="0.8" />
              </g>
            )
          })}
          <ellipse cx={center} cy={center + radius * 0.18} rx={radius * 0.74} ry={radius * 0.48} fill="none" stroke={colors.stroke} strokeWidth="1.4" opacity="0.36" />
        </g>
        {selected && <SelectionRing center={center} radius={radius} />}
      </svg>
    )
  }

  return null
}
