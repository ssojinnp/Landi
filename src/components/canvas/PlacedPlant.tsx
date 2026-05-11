import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { PlantSymbol } from './PlantSymbol'
import { PlantNameLabel } from './PlantNameLabel'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../data/plants'
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
  onSelect: (event: ReactMouseEvent<HTMLDivElement> | ReactPointerEvent<HTMLDivElement>) => void
  onTransformStart: () => void
  onMove: (updates: Pick<Plant, 'x' | 'y'>, options?: { recordHistory?: boolean }) => void
  onResize: (updates: Pick<Plant, 'x' | 'y' | 'size'>, options?: { recordHistory?: boolean }) => void
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

  return <button type="button" onPointerDown={(event) => onResizeStart(anchor, event)} className={`resize-handle export-hidden pointer-events-auto absolute h-2 w-2 touch-none rounded-[1.5px] border ${positionMap[anchor]}`} style={{ backgroundColor: '#2563eb', borderColor: '#ffffff' }} aria-label={`식재 ${anchor} 방향 크기 조절`} />
}

export function PlacedPlant({ plant, selected, plantIntensity, showLabel, boardScale, readOnly, onSelect, onTransformStart, onMove, onResize }: PlacedPlantProps) {
  const dragSnapshotRecordedRef = useRef(false)
  const handles: ResizeAnchor[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const normalizedIntensity = clampPercent(plantIntensity)
  const symbolOpacity = Math.max(0.25, normalizedIntensity / 100)
  const symbolFilter = `saturate(${80 + normalizedIntensity * 0.45}%) contrast(${90 + normalizedIntensity * 0.2}%) drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))`
  const defaultHitSize = Math.max(32, Math.min(plant.size * 0.58, 58))
  const groundcoverHitWidth = Math.max(30, Math.min(plant.size * 0.48, 48))
  const groundcoverHitHeight = Math.max(24, Math.min(plant.size * 0.38, 38))
  const defaultSelectionSize = Math.max(32, Math.min(plant.size * 0.66, 72))
  const groundcoverSelectionWidth = Math.max(30, Math.min(plant.size * 0.58, 64))
  const groundcoverSelectionHeight = Math.max(24, Math.min(plant.size * 0.46, 48))
  const hitAreaStyle =
    plant.kind === 'groundcover'
      ? { left: 8 + plant.size * 0.5 - groundcoverHitWidth / 2, top: 8 + plant.size * 0.64 - groundcoverHitHeight / 2, width: groundcoverHitWidth, height: groundcoverHitHeight }
      : { left: 8 + plant.size * 0.5 - defaultHitSize / 2, top: 8 + plant.size * 0.5 - defaultHitSize / 2, width: defaultHitSize, height: defaultHitSize }
  const selectionBoxStyle =
    plant.kind === 'groundcover'
      ? { left: 8 + plant.size * 0.5 - groundcoverSelectionWidth / 2, top: 8 + plant.size * 0.62 - groundcoverSelectionHeight / 2, width: groundcoverSelectionWidth, height: groundcoverSelectionHeight, outlineColor: '#2563eb' }
      : { left: 8 + plant.size * 0.5 - defaultSelectionSize / 2, top: 8 + plant.size * 0.5 - defaultSelectionSize / 2, width: defaultSelectionSize, height: defaultSelectionSize, outlineColor: '#2563eb' }

  const startResize = (anchor: ResizeAnchor, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (readOnly) return
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startSize = plant.size
    const startPlantX = plant.x
    const startPlantY = plant.y
    onTransformStart()

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
      }, { recordHistory: false })
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    onSelect(event)
    if (readOnly) return

    const startX = event.clientX
    const startY = event.clientY
    const startPlantX = plant.x
    const startPlantY = plant.y
    dragSnapshotRecordedRef.current = false

    const move = (moveEvent: PointerEvent) => {
      if (!dragSnapshotRecordedRef.current) {
        onTransformStart()
        dragSnapshotRecordedRef.current = true
      }
      const nextX = startPlantX + (moveEvent.clientX - startX) / boardScale
      const nextY = startPlantY + (moveEvent.clientY - startY) / boardScale
      onMove({
        x: Math.min(BOARD_WIDTH - plant.size, Math.max(0, nextX)),
        y: Math.min(BOARD_HEIGHT - plant.size, Math.max(0, nextY)),
      }, { recordHistory: false })
    }

    const up = () => {
      dragSnapshotRecordedRef.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      className={`group pointer-events-none absolute touch-none select-none ${readOnly ? 'cursor-default' : 'cursor-move'}`}
      style={{ left: plant.x + PLANT_SYMBOL_OFFSET_X, top: plant.y + PLANT_SYMBOL_OFFSET_Y, width: plant.size + 16, height: plant.size + 20 }}
    >
        <div className="relative pointer-events-none" style={{ opacity: symbolOpacity, filter: symbolFilter }}>
          <PlantSymbol plant={plant} />
        </div>
        <div
          className={`plant-hit-area pointer-events-auto absolute rounded-full ${readOnly ? 'cursor-default' : 'cursor-move'}`}
          style={hitAreaStyle}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={startMove}
        />
        {selected && !readOnly && (
          <div className="export-hidden pointer-events-none absolute rounded-md outline outline-1 outline-offset-0" style={selectionBoxStyle}>
            {handles.map((anchor) => <ResizeHandle key={anchor} anchor={anchor} onResizeStart={startResize} />)}
          </div>
        )}
        {showLabel && <PlantNameLabel plant={plant} />}
        {!showLabel && <PlantNameLabel plant={plant} hoverOnly exportHidden />}
    </div>
  )
}
