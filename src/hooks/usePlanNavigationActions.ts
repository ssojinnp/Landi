import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { createPlan } from '../lib/planHelpers'
import { getPlanRole, supabase, type LandiUser } from '../lib/supabase'
import type { Plan, ViewMode } from '../types'

type UsePlanNavigationActionsOptions = {
  plans: Plan[]
  authUser: LandiUser | null
  selectedPlanId: string
  mode: ViewMode
  guideReturnMode: ViewMode
  setPlans: Dispatch<SetStateAction<Plan[]>>
  setSelectedPlanId: (value: string) => void
  setSelectedPlantId: (value: string | null) => void
  setMode: (value: ViewMode) => void
  setGuideReturnMode: (value: ViewMode) => void
  setAuthError: (value: string) => void
}

export function usePlanNavigationActions({
  plans,
  authUser,
  selectedPlanId,
  mode,
  guideReturnMode,
  setPlans,
  setSelectedPlanId,
  setSelectedPlantId,
  setMode,
  setGuideReturnMode,
  setAuthError,
}: UsePlanNavigationActionsOptions) {
  const createNewPlan = useCallback(() => {
    const next = createPlan(`새 조감도 ${plans.length + 1}`, authUser)
    setPlans((current) => [next, ...current])
    setSelectedPlanId(next.id)
    setSelectedPlantId(null)
    setMode('edit')
  }, [authUser, plans.length, setMode, setPlans, setSelectedPlantId, setSelectedPlanId])

  const deletePlan = useCallback((planId: string) => {
    const targetPlan = plans.find((plan) => plan.id === planId)
    if (!targetPlan || getPlanRole(targetPlan, authUser) !== 'owner') return

    const nextPlans = plans.filter((plan) => plan.id !== planId)
    setPlans(nextPlans)
    if (supabase && authUser) {
      void supabase.from('plans').delete().eq('id', planId).then(({ error }) => {
        if (error) setAuthError(`조감도를 삭제하지 못했습니다. ${error.message}`)
      })
    }
    if (selectedPlanId === planId) {
      setSelectedPlanId(nextPlans[0]?.id ?? '')
      setSelectedPlantId(null)
      setMode('list')
    }
  }, [authUser, plans, selectedPlanId, setAuthError, setMode, setPlans, setSelectedPlantId, setSelectedPlanId])

  const openPreview = useCallback((planId: string) => {
    setSelectedPlanId(planId)
    setSelectedPlantId(null)
    setMode('preview')
  }, [setMode, setSelectedPlantId, setSelectedPlanId])

  const openEditor = useCallback((planId: string) => {
    setSelectedPlanId(planId)
    setSelectedPlantId(null)
    setMode('edit')
  }, [setMode, setSelectedPlantId, setSelectedPlanId])

  const openGuide = useCallback(() => {
    setGuideReturnMode(mode === 'guide' ? 'list' : mode)
    setMode('guide')
  }, [mode, setGuideReturnMode, setMode])

  const closeGuide = useCallback(() => {
    setMode(guideReturnMode === 'guide' ? 'list' : guideReturnMode)
  }, [guideReturnMode, setMode])

  return {
    createNewPlan,
    deletePlan,
    openPreview,
    openEditor,
    openGuide,
    closeGuide,
  }
}
