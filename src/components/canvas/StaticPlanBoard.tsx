import { ImagePlus } from 'lucide-react'
import { PlantSymbol } from './PlantSymbol'
import { PlantNameLabel } from './PlantNameLabel'
import { EMPTY_PLAN_TITLE } from '../../lib/planHelpers'
import { clampPercent, getRepresentativeLabelIds, PLANT_SYMBOL_OFFSET_X, PLANT_SYMBOL_OFFSET_Y } from '../../lib/canvasHelpers'
import type { Plan } from '../../types'

type StaticPlanBoardProps = {
  plan: Plan
  showEmptyState?: boolean
}

export function StaticPlanBoard({ plan, showEmptyState = true }: StaticPlanBoardProps) {
  const backgroundFade = clampPercent(plan.backgroundFade ?? 62)
  const backgroundSaturation = clampPercent(plan.backgroundSaturation ?? 100)
  const plantIntensity = clampPercent(plan.plantIntensity ?? 100)
  const showPlantLabels = plan.showPlantLabels ?? false
  const representativeLabelIds = getRepresentativeLabelIds(plan.plants)
  const overlay = backgroundFade / 100
  const symbolOpacity = Math.max(0.25, plantIntensity / 100)
  const symbolFilter = `saturate(${80 + plantIntensity * 0.45}%) contrast(${90 + plantIntensity * 0.2}%)`

  return (
    <div className="relative h-[640px] w-[1120px] overflow-visible border border-[var(--landi-board-border)] bg-[var(--landi-board)]">
      {plan.backgroundUrl ? (
        <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,${overlay}), rgba(255,255,255,${overlay})), url(${plan.backgroundUrl})`, filter: `saturate(${backgroundSaturation}%)` }} />
      ) : (
        <div className="absolute inset-0 bg-[var(--landi-board)]" />
      )}
      {showEmptyState && !plan.backgroundUrl && plan.plants.length === 0 && (
        <div className="absolute left-1/2 top-1/2 z-10 w-[min(320px,calc(100%-56px))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white/92 px-5 py-5 text-center shadow-[0_10px_26px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-500">
            <ImagePlus size={20} />
          </div>
          <p className="mt-3 text-[14px] font-semibold text-slate-900">{EMPTY_PLAN_TITLE}</p>
        </div>
      )}
      {plan.plants.map((plant) => (
        <div key={plant.instanceId} className="absolute touch-none select-none" style={{ left: plant.x + PLANT_SYMBOL_OFFSET_X, top: plant.y + PLANT_SYMBOL_OFFSET_Y, width: plant.size + 16, height: plant.size + 20, filter: 'drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))' }}>
          <div style={{ opacity: symbolOpacity, filter: symbolFilter }}>
            <PlantSymbol plant={plant} />
          </div>
          {showPlantLabels && representativeLabelIds.has(plant.instanceId) && <PlantNameLabel plant={plant} />}
        </div>
      ))}
    </div>
  )
}
