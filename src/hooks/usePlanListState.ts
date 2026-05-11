import { useMemo } from 'react'
import { createDemoPlans } from '../lib/demoPlans'
import { getPlanRole, type LandiUser } from '../lib/supabase'
import type { Plan } from '../types'

type UsePlanListStateOptions = {
  plans: Plan[]
  authUser: LandiUser | null
}

export function usePlanListState({ plans, authUser }: UsePlanListStateOptions) {
  const editablePlanCount = useMemo(
    () =>
      plans.filter((plan) => {
        const role = getPlanRole(plan, authUser)
        return role === 'owner' || role === 'editor'
      }).length,
    [plans, authUser],
  )
  const sharedPlanCount = useMemo(
    () => plans.filter((plan) => getPlanRole(plan, authUser) !== 'owner').length,
    [plans, authUser],
  )
  const planWithBoardCount = useMemo(
    () => plans.filter((plan) => Boolean(plan.backgroundUrl)).length,
    [plans],
  )
  const demoPlans = useMemo(() => createDemoPlans(authUser), [authUser])
  const displayPlans = useMemo(() => [...demoPlans, ...plans], [demoPlans, plans])

  return {
    editablePlanCount,
    sharedPlanCount,
    planWithBoardCount,
    displayPlans,
  }
}
