import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'
import { PlantSymbol } from './PlantSymbol'
import { PlantNameLabel } from './PlantNameLabel'
import { clampPercent, clampPlantSize, PLANT_SYMBOL_OFFSET_X, PLANT_SYMBOL_OFFSET_Y } from '../../lib/canvasHelpers'
import type { Plant } from '../../types'

type ResizeAnchor = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

type PlacedPlantProps = {
  plant: Plant
  selected: boolean
  plantIntensity: number
  showLabel: boolean
  boardScale: number
  readOnly: boolean
  onSelect: () => void
  onMove: (updates: Pick<Plant, 'x' | 'y'>) => void
  onResize: (updates: Pick<Plant, 'x' | 'y' | 'size'>) => void
}

function ResizeHandle({ anchor, onResizeStart }: { anchor: ResizeAnchor; onResizeStart: (anchor: ResizeAnchor, event: ReactPointerEvent<HTMLButtonElement>) => void }) {
  const positionMap: Record<ResizeAnchor, string> = {
    n: 'left-1/2 -top-1 -translate-x-1/2 cursor-ns-resize',
    e: '-right-1 top-1/2 -translate-y-1/2 cursor-ew-resize',
    s: 'left-1/2 -bottom-1 -translate-x-1/2 cursor-ns-resize',
    w: '-left-1 top-1/2 -translate-y-1/2 cursor-ew-resize',
    ne: '-right-1 -top-1 cursor-nesw-resize',
    nw: '-left-1 -top-1 cursor-nwse-resize',
    se: '-bottom-1 -right-1 cursor-nwse-resize',
    sw: '-bottom-1 -left-1 cursor-nesw-resize',
  }

  return <button type="button" onPointerDown={(event) => onResizeStart(anchor, event)} className={`resize-handle export-hidden absolute h-2 w-2 touch-none rounded-[1.5px] border ${positionMap[anchor]}`} style={{ backgroundColor: '#2563eb', borderColor: '#ffffff' }} aria-label={`식재 ${anchor} 방향 크기 조절`} />
}

export function PlacedPlant({ plant, selected, plantIntensity, showLabel, boardScale, readOnly, onSelect, onMove, onResize }: PlacedPlantProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const handles: ResizeAnchor[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const normalizedIntensity = clampPercent(plantIntensity)
  const symbolOpacity = Math.max(0.25, normalizedIntensity / 100)
  const symbolFilter = `saturate(${80 + normalizedIntensity * 0.45}%) contrast(${90 + normalizedIntensity * 0.2}%)`

  const startResize = (anchor: ResizeAnchor, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (readOnly) return
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startSize = plant.size
    const startPlantX = plant.x
    const startPlantY = plant.y

    const move = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / boardScale
      const deltaY = (moveEvent.clientY - startY) / boardScale
      const horizontalDelta = anchor.includes('e') ? deltaX : anchor.includes('w') ? -deltaX : 0
      const verticalDelta = anchor.includes('s') ? deltaY : anchor.includes('n') ? -deltaY : 0
      const delta = anchor.length === 2 ? Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta : horizontalDelta || verticalDelta
      const nextSize = clampPlantSize(startSize + delta)
      const sizeDelta = nextSize - startSize
      onResize({
        size: nextSize,
        x: anchor.includes('w') ? startPlantX - sizeDelta : startPlantX,
        y: anchor.includes('n') ? startPlantY - sizeDelta : startPlantY,
      })
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: plant.x + PLANT_SYMBOL_OFFSET_X, y: plant.y + PLANT_SYMBOL_OFFSET_Y }}
      bounds="parent"
      cancel=".resize-handle"
      disabled={readOnly}
      scale={boardScale}
      onStop={(_: DraggableEvent, data: DraggableData) => onMove({ x: data.x - PLANT_SYMBOL_OFFSET_X, y: data.y - PLANT_SYMBOL_OFFSET_Y })}
    >
      <div
        ref={nodeRef}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        className={`group absolute touch-none select-none ${readOnly ? 'cursor-default' : 'cursor-move'}`}
        style={{ width: plant.size + 16, height: plant.size + 20, filter: 'drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))' }}
      >
        <div className="relative" style={{ opacity: selected ? Math.min(0.92, symbolOpacity) : symbolOpacity, filter: symbolFilter }}>
          <PlantSymbol plant={plant} />
        </div>
        {selected && !readOnly && (
          <div className="export-hidden absolute left-2 top-2 rounded-md outline outline-1 outline-offset-0" style={{ width: plant.size, height: plant.size, outlineColor: '#2563eb' }}>
            {handles.map((anchor) => <ResizeHandle key={anchor} anchor={anchor} onResizeStart={startResize} />)}
          </div>
        )}
        {showLabel && <PlantNameLabel plant={plant} />}
        {!showLabel && <PlantNameLabel plant={plant} hoverOnly exportHidden />}
      </div>
    </Draggable>
  )
}
