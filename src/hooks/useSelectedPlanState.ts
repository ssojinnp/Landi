import { useMemo } from 'react'
import { kindOptions } from '../data/plants'
import { clampPercent, getRepresentativeLabelIds } from '../lib/canvasHelpers'
import { getPlanUpdatedLabel } from '../lib/planHelpers'
import { getPlanRole, type LandiUser } from '../lib/supabase'
import type { Plan, PlanRole } from '../types'

type PlantCategory = '나무' | '풀' | '꽃'

type UseSelectedPlanStateOptions = {
  plans: Plan[]
  selectedPlanId: string
  selectedPlantId: string | null
  authUser: LandiUser | null
  visiblePlantCategories: Record<PlantCategory, boolean>
}

export function useSelectedPlanState({
  plans,
  selectedPlanId,
  selectedPlantId,
  authUser,
  visiblePlantCategories,
}: UseSelectedPlanStateOptions) {
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0],
    [plans, selectedPlanId],
  )
  const selectedPlant = useMemo(
    () => selectedPlan?.plants.find((plant) => plant.instanceId === selectedPlantId),
    [selectedPlan, selectedPlantId],
  )
  const representativeLabelIds = useMemo(
    () => getRepresentativeLabelIds(selectedPlan?.plants ?? []),
    [selectedPlan?.plants],
  )
  const selectedPlanRole = useMemo<PlanRole>(
    () => (selectedPlan ? getPlanRole(selectedPlan, authUser) : 'viewer'),
    [selectedPlan, authUser],
  )
  const canEditSelectedPlan = selectedPlanRole === 'owner' || selectedPlanRole === 'editor'
  const canManageSelectedPlan = selectedPlanRole === 'owner' && Boolean(authUser)
  const canOpenSelectedPlanEditor = canEditSelectedPlan
  const hasPlanBackground = Boolean(selectedPlan?.backgroundUrl)
  const canPlacePlants = canEditSelectedPlan && hasPlanBackground
  const canUseBoardControls = canEditSelectedPlan && hasPlanBackground

  const inventory = useMemo(
    () =>
      selectedPlan?.palette.map((template) => ({
        ...template,
        count: selectedPlan.plants.filter((plant) => plant.templateId === template.id).length,
      })) ?? [],
    [selectedPlan],
  )

  const groupedInventory = useMemo(
    () =>
      kindOptions
        .map((group) => {
          const items = inventory.filter((item) => item.category === group.category && item.count > 0)
          const total = items.reduce((sum, item) => sum + item.count, 0)
          return { ...group, items, total }
        })
        .filter((group) => group.items.length > 0),
    [inventory],
  )

  const backgroundFade = clampPercent(selectedPlan?.backgroundFade ?? 62)
  const backgroundOverlay = backgroundFade / 100
  const backgroundSaturation = clampPercent(selectedPlan?.backgroundSaturation ?? 100)
  const plantIntensity = clampPercent(selectedPlan?.plantIntensity ?? 100)
  const showPlantLabels = selectedPlan?.showPlantLabels ?? false
  const visiblePlants = useMemo(
    () => selectedPlan?.plants.filter((plant) => visiblePlantCategories[plant.category as PlantCategory] ?? true) ?? [],
    [selectedPlan?.plants, visiblePlantCategories],
  )
  const ownerLabel = selectedPlan?.ownerEmail ?? authUser?.email ?? '로컬 조감도'
  const roleLabel = selectedPlanRole === 'owner' ? '소유자' : selectedPlanRole === 'editor' ? '수정가능' : '읽기전용'
  const selectedPlanUpdatedLabel = selectedPlan ? getPlanUpdatedLabel(selectedPlan) : ''

  return {
    selectedPlan,
    selectedPlant,
    representativeLabelIds,
    selectedPlanRole,
    canEditSelectedPlan,
    canManageSelectedPlan,
    canOpenSelectedPlanEditor,
    hasPlanBackground,
    canPlacePlants,
    canUseBoardControls,
    groupedInventory,
    backgroundFade,
    backgroundOverlay,
    backgroundSaturation,
    plantIntensity,
    showPlantLabels,
    visiblePlants,
    ownerLabel,
    roleLabel,
    selectedPlanUpdatedLabel,
  }
}
