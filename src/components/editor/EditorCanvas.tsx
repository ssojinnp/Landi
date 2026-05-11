import type { ChangeEvent, DragEvent, MouseEvent, PointerEvent, RefObject } from 'react'
import { ImagePlus, Minus, Plus, Trash2 } from 'lucide-react'
import { PlacedPlant } from '../canvas/PlacedPlant'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../data/plants'
import { clampPlantSize, PLANT_SIZE_MAX, PLANT_SIZE_MIN, PLANT_SIZE_STEP } from '../../lib/canvasHelpers'
import { EMPTY_PLAN_TITLE } from '../../lib/planHelpers'
import type { Plan, Plant } from '../../types'

type EditorCanvasProps = {
  selectedPlan: Plan
  boardScale: number
  backgroundOverlay: number
  backgroundSaturation: number
  plantIntensity: number
  showPlantLabels: boolean
  representativeLabelIds: Set<string>
  visiblePlants: Plant[]
  selectedPlantIds: string[]
  selectedPlant?: Plant
  selectedPlantToolbarStyle?: { left: number; top: number }
  canEditSelectedPlan: boolean
  boardFrameRef: RefObject<HTMLDivElement | null>
  canvasRef: RefObject<HTMLDivElement | null>
  onSelectPlant: (instanceId: string, additive?: boolean) => void
  onClearSelection: () => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onUpdatePlant: (instanceId: string, updates: Partial<Plant>, options?: { recordHistory?: boolean }) => void
  onBeginPlantTransform: () => void
  onDeleteSelectedPlant: () => void
  onPickPlantAtPoint: (point: { x: number; y: number }, additive?: boolean) => void
}

export function EditorCanvas({
  selectedPlan,
  boardScale,
  backgroundOverlay,
  backgroundSaturation,
  plantIntensity,
  showPlantLabels,
  representativeLabelIds,
  visiblePlants,
  selectedPlantIds,
  selectedPlant,
  selectedPlantToolbarStyle,
  canEditSelectedPlan,
  boardFrameRef,
  canvasRef,
  onSelectPlant,
  onClearSelection,
  onUpload,
  onDrop,
  onUpdatePlant,
  onBeginPlantTransform,
  onDeleteSelectedPlant,
  onPickPlantAtPoint,
}: EditorCanvasProps) {
  const handleBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canEditSelectedPlan || !canvasRef.current || event.target !== event.currentTarget) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = canvasRef.current.getBoundingClientRect()
    onPickPlantAtPoint({
      x: (event.clientX - bounds.left) / boardScale,
      y: (event.clientY - bounds.top) / boardScale,
    }, event.shiftKey)
  }

  return (
    <div ref={boardFrameRef} className="relative mx-auto w-full max-w-[1120px] rounded-md bg-white p-1.5 shadow-[0_18px_48px_rgba(47,55,43,0.12)] md:p-2">
      <div className="relative overflow-hidden" style={{ width: Math.ceil(BOARD_WIDTH * boardScale), maxWidth: '100%', height: Math.ceil(BOARD_HEIGHT * boardScale) }}>
        <div
          ref={canvasRef}
          data-export-board="true"
          onClick={onClearSelection}
          onPointerDown={handleBoardPointerDown}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="relative origin-top-left overflow-visible border"
          style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `scale(${boardScale})`, backgroundColor: '#f7f7f2', borderColor: '#d8ded4' }}
        >
          {selectedPlan.backgroundUrl && (
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `linear-gradient(rgba(255,255,255,${backgroundOverlay}), rgba(255,255,255,${backgroundOverlay})), url(${selectedPlan.backgroundUrl})`, filter: `saturate(${backgroundSaturation}%)` }}
            />
          )}
          {!selectedPlan.backgroundUrl && selectedPlan.plants.length === 0 && (
            <div className="absolute left-1/2 top-1/2 z-10 w-[min(432px,calc(100%-48px))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-dashed border-slate-300 bg-white/92 px-5 py-6 text-center shadow-sm backdrop-blur-sm">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-500">
                <ImagePlus size={22} />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-slate-900">{EMPTY_PLAN_TITLE}</p>
              <p className="mt-1.5 text-[13px] leading-5 text-slate-500">도면을 업로드하면 편집보드에서 바로 배치를 시작할 수 있습니다.</p>
              {canEditSelectedPlan ? (
                <label className="landi-form-control mx-auto mt-4 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--landi-accent-copper)] px-3 text-white shadow-sm transition hover:bg-[var(--landi-accent-copper-dark)]">
                  <ImagePlus size={16} />
                  도면 업로드
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} className="sr-only" />
                </label>
              ) : (
                <p className="mt-3 text-[12px] font-medium text-slate-400">읽기전용 권한에서는 도면을 업로드할 수 없습니다.</p>
              )}
            </div>
          )}
          {visiblePlants.map((plant) => (
            <PlacedPlant
              key={plant.instanceId}
              plant={plant}
              selected={selectedPlantIds.includes(plant.instanceId)}
              plantIntensity={plantIntensity}
              showLabel={showPlantLabels && representativeLabelIds.has(plant.instanceId)}
              boardScale={boardScale}
              readOnly={!canEditSelectedPlan}
              onSelect={(event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>) => onSelectPlant(plant.instanceId, event.shiftKey)}
              onTransformStart={onBeginPlantTransform}
              onMove={(updates, options) => onUpdatePlant(plant.instanceId, updates, options)}
              onResize={(updates, options) => onUpdatePlant(plant.instanceId, updates, options)}
            />
          ))}
          {selectedPlant && canEditSelectedPlan && selectedPlantToolbarStyle && selectedPlantIds.length <= 1 && (
            <div
              className="export-hidden absolute z-30 flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur"
              style={selectedPlantToolbarStyle}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onUpdatePlant(selectedPlant.instanceId, { size: clampPlantSize(selectedPlant.size - PLANT_SIZE_STEP) })}
                disabled={selectedPlant.size <= PLANT_SIZE_MIN}
                className="grid h-8 w-8 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                aria-label="선택 식물 축소"
              >
                <Minus size={16} />
              </button>
              <span className="group/size relative grid min-w-[52px] px-1 text-center leading-none">
                <span className="text-xs font-semibold text-slate-700">{Math.round(selectedPlant.size)}px</span>
                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-40 hidden w-max max-w-[180px] -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.16)] group-hover/size:block">
                  <span className="block text-[11px] font-semibold text-slate-800">크기 {PLANT_SIZE_MIN}-{PLANT_SIZE_MAX}px</span>
                  <span className="mt-1 block text-[11px] font-medium text-slate-500">버튼 ±{PLANT_SIZE_STEP}px · 드래그 자유</span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => onUpdatePlant(selectedPlant.instanceId, { size: clampPlantSize(selectedPlant.size + PLANT_SIZE_STEP) })}
                disabled={selectedPlant.size >= PLANT_SIZE_MAX}
                className="grid h-8 w-8 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                aria-label="선택 식물 확대"
              >
                <Plus size={16} />
              </button>
              <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" />
              <button type="button" onClick={onDeleteSelectedPlant} className="grid h-8 w-8 place-items-center rounded-md text-[var(--landi-danger)] hover:bg-[var(--landi-danger-soft)]" aria-label="선택 식물 삭제">
                <Trash2 size={16} />
              </button>
            </div>
          )}
          {selectedPlant && canEditSelectedPlan && selectedPlantToolbarStyle && selectedPlantIds.length > 1 && (
            <div
              className="export-hidden absolute z-30 flex items-center gap-2 rounded-md border border-slate-200 bg-white/95 p-1 pl-3 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur"
              style={selectedPlantToolbarStyle}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span className="text-[12px] font-semibold text-slate-700">{selectedPlantIds.length}개 선택됨</span>
              <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
              <button type="button" onClick={onDeleteSelectedPlant} className="grid h-8 w-8 place-items-center rounded-md text-[var(--landi-danger)] hover:bg-[var(--landi-danger-soft)]" aria-label="선택 식재 삭제">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
