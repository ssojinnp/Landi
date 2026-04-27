import { BOARD_HEIGHT } from '../../data/plants'
import type { Plant } from '../../types'

type PlantNameLabelProps = {
  plant: Plant
  hoverOnly?: boolean
  exportHidden?: boolean
}

export function PlantNameLabel({ plant, hoverOnly = false, exportHidden = false }: PlantNameLabelProps) {
  const shouldPlaceAbove = plant.y + plant.size + 76 > BOARD_HEIGHT
  const verticalClass = shouldPlaceAbove ? 'bottom-[calc(100%-8px)]' : 'top-[calc(100%-10px)]'
  const visibilityClass = hoverOnly ? 'opacity-0 transition-opacity group-hover:opacity-100' : ''

  return (
    <div
      className={`${exportHidden ? 'export-hidden ' : ''}pointer-events-none absolute left-1/2 h-[18px] w-max max-w-[180px] -translate-x-1/2 overflow-hidden truncate whitespace-nowrap rounded-sm px-2 text-center text-[10px] font-semibold ${verticalClass} ${visibilityClass}`}
      title={plant.name}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)', border: '1px solid rgba(15, 23, 42, 0.10)', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.16)', color: '#334155', lineHeight: '18px', textOverflow: 'ellipsis' }}
    >
      <span className="landi-plant-label-text">{plant.name}</span>
    </div>
  )
}
