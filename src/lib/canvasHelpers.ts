import type { Plant } from '../types'

export const PLANT_SIZE_MIN = 28
export const PLANT_SIZE_MAX = 190
export const PLANT_SIZE_STEP = 8
export const PLANT_SYMBOL_OFFSET_X = 4
export const PLANT_SYMBOL_OFFSET_Y = 3

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function clampPlantSize(value: number) {
  return Math.min(PLANT_SIZE_MAX, Math.max(PLANT_SIZE_MIN, value))
}

export function getRepresentativeLabelIds(plants: Plant[]) {
  const seenTemplateIds = new Set<string>()
  const labelIds = new Set<string>()

  plants.forEach((plant) => {
    if (seenTemplateIds.has(plant.templateId)) return
    seenTemplateIds.add(plant.templateId)
    labelIds.add(plant.instanceId)
  })

  return labelIds
}
