import { useCallback, useEffect, useState } from 'react'
import { getEditorMetadata } from '../lib/planHelpers'
import { normalizePlanForUser, type LandiUser } from '../lib/supabase'
import type { Plan, Plant, ViewMode } from '../types'

type UpdateOptions = {
  recordHistory?: boolean
}

type UsePlanSelectionActionsOptions = {
  selectedPlan?: Plan
  selectedPlantId: string | null
  authUser: LandiUser | null
  canEditSelectedPlan: boolean
  mode: ViewMode
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>
  setSelectedPlantId: (value: string | null) => void
  setSelectedPlantIds: React.Dispatch<React.SetStateAction<string[]>>
}

export function usePlanSelectionActions({
  selectedPlan,
  selectedPlantId,
  authUser,
  canEditSelectedPlan,
  mode,
  setPlans,
  setSelectedPlantId,
  setSelectedPlantIds,
}: UsePlanSelectionActionsOptions) {
  const [planUndoStack, setPlanUndoStack] = useState<Plan[]>([])

  const recordPlanSnapshot = useCallback(() => {
    if (!selectedPlan || !canEditSelectedPlan) return
    setPlanUndoStack((current) => [...current.slice(-49), selectedPlan])
  }, [canEditSelectedPlan, selectedPlan])

  const updateSelectedPlan = useCallback((updates: Partial<Plan>, options: UpdateOptions = {}) => {
    if (!selectedPlan || !canEditSelectedPlan) return
    if (options.recordHistory !== false) recordPlanSnapshot()
    setPlans((current) => current.map((plan) => {
      if (plan.id !== selectedPlan.id) return plan
      const nextPlan = { ...plan, ...updates, updatedAt: new Date().toISOString(), ...getEditorMetadata(authUser) }
      return authUser ? normalizePlanForUser(nextPlan, authUser) : nextPlan
    }))
  }, [authUser, canEditSelectedPlan, recordPlanSnapshot, selectedPlan, setPlans])

  const updatePlants = useCallback((updater: (plants: Plant[]) => Plant[], options: UpdateOptions = {}) => {
    if (!selectedPlan) return
    const nextPlants = updater(selectedPlan.plants)
    if (nextPlants === selectedPlan.plants) return
    updateSelectedPlan({ plants: nextPlants }, options)
  }, [selectedPlan, updateSelectedPlan])

  const undoLastPlanChange = useCallback(() => {
    if (!selectedPlan || !canEditSelectedPlan) return
    setPlanUndoStack((current) => {
      const previousPlan = current[current.length - 1]
      if (!previousPlan) return current
      setPlans((plansCurrent) => plansCurrent.map((plan) => (plan.id === previousPlan.id ? previousPlan : plan)))
      setSelectedPlantId(null)
      setSelectedPlantIds([])
      return current.slice(0, -1)
    })
  }, [canEditSelectedPlan, selectedPlan, setPlans, setSelectedPlantId, setSelectedPlantIds])

  const selectPlant = useCallback((instanceId: string, additive = false) => {
    if (!canEditSelectedPlan) {
      setSelectedPlantId(instanceId)
      setSelectedPlantIds([instanceId])
      return
    }
    if (additive) {
      setSelectedPlantIds((current) => {
        const exists = current.includes(instanceId)
        const next = exists ? current.filter((id) => id !== instanceId) : [...current, instanceId]
        setSelectedPlantId(next.at(-1) ?? null)
        return next
      })
      return
    }

    setSelectedPlantId(instanceId)
    setSelectedPlantIds([instanceId])
    updatePlants((current) => {
      const index = current.findIndex((plant) => plant.instanceId === instanceId)
      if (index < 0 || index === current.length - 1) return current
      const next = [...current]
      const [target] = next.splice(index, 1)
      next.push(target)
      return next
    })
  }, [canEditSelectedPlan, setSelectedPlantId, setSelectedPlantIds, updatePlants])

  const pickPlantAtPoint = useCallback((point: { x: number; y: number }, additive = false) => {
    if (!selectedPlan || !canEditSelectedPlan) return
    const hitPlants = selectedPlan.plants.filter((plant) => {
      const centerX = plant.x + plant.size / 2
      const centerY = plant.y + plant.size / 2
      const radius = Math.max(18, Math.min(plant.size * 0.42, 44))
      return Math.hypot(point.x - centerX, point.y - centerY) <= radius
    })
    if (hitPlants.length === 0) return
    const currentIndex = hitPlants.findIndex((plant) => plant.instanceId === selectedPlantId)
    const nextPlant = hitPlants[(currentIndex + 1) % hitPlants.length]
    selectPlant(nextPlant.instanceId, additive)
  }, [canEditSelectedPlan, selectedPlan, selectedPlantId, selectPlant])

  const clearPlantSelection = useCallback(() => {
    setSelectedPlantId(null)
    setSelectedPlantIds([])
  }, [setSelectedPlantId, setSelectedPlantIds])

  useEffect(() => {
    const handleUndoShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'z' || (!event.ctrlKey && !event.metaKey) || event.shiftKey || event.altKey) return
      if (mode !== 'edit') return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return
      event.preventDefault()
      undoLastPlanChange()
    }

    window.addEventListener('keydown', handleUndoShortcut)
    return () => window.removeEventListener('keydown', handleUndoShortcut)
  }, [mode, undoLastPlanChange])

  return {
    canUndoPlanChange: canEditSelectedPlan && planUndoStack.length > 0,
    recordPlanSnapshot,
    updateSelectedPlan,
    updatePlants,
    undoLastPlanChange,
    selectPlant,
    pickPlantAtPoint,
    clearPlantSelection,
  }
}
