import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { migratePlan } from '../lib/planHelpers'
import { getPlanRole, planToSharedRow, sharedRowToPlan, supabase, type LandiUser, type SharedPlanRow } from '../lib/supabase'
import type { Plan } from '../types'

export type PlanSaveStatus = 'saved' | 'saving' | 'error'

type UsePlanPersistenceOptions = {
  plans: Plan[]
  authUser: LandiUser | null
  storageKey: string
  setPlans: Dispatch<SetStateAction<Plan[]>>
  setSelectedPlanId: Dispatch<SetStateAction<string>>
  setAuthError: Dispatch<SetStateAction<string>>
  setSaveStatus: Dispatch<SetStateAction<PlanSaveStatus>>
}

export function usePlanPersistence({
  plans,
  authUser,
  storageKey,
  setPlans,
  setSelectedPlanId,
  setAuthError,
  setSaveStatus,
}: UsePlanPersistenceOptions) {
  const [isSharedPlansLoading, setIsSharedPlansLoading] = useState(false)
  const applyingRemotePlansRef = useRef(false)
  const saveSequenceRef = useRef(0)
  const remoteSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!supabase || !authUser?.email) return
    const supabaseClient = supabase
    let active = true

    const loadSharedPlans = async (showLoading = false) => {
      if (showLoading) setIsSharedPlansLoading(true)
      const { data, error } = await supabaseClient
        .from('plans')
        .select('*')
        .contains('access_emails', [authUser.email.toLowerCase()])
        .order('updated_at', { ascending: false })

      if (!active) return
      if (error) {
        setAuthError(`공유 조감도를 불러오지 못했습니다. ${error.message}`)
        if (showLoading) setIsSharedPlansLoading(false)
        return
      }
      if (data) {
        applyingRemotePlansRef.current = true
        const sharedRows = data as SharedPlanRow[]
        const joinedPlanIds: string[] = []
        const joinedAt = new Date().toISOString()
        const sharedPlans = sharedRows.map((row) => {
          const plan = migratePlan(sharedRowToPlan(row))
          if (plan.ownerId === authUser.id || plan.ownerEmail?.toLowerCase() === authUser.email.toLowerCase()) return plan
          const member = plan.members?.find((item) => item.email.toLowerCase() === authUser.email.toLowerCase())
          if (!member || member.status === 'joined') return plan
          joinedPlanIds.push(plan.id)
          return {
            ...plan,
            members: (plan.members ?? []).map((item) => item.email.toLowerCase() === authUser.email.toLowerCase() ? { ...item, status: 'joined' as const, joinedAt: item.joinedAt ?? joinedAt } : item),
          }
        })
        setPlans(sharedPlans)
        setSelectedPlanId((current) => sharedPlans.some((plan) => plan.id === current) ? current : sharedPlans[0]?.id ?? '')
        if (joinedPlanIds.length > 0) {
          const { data: sessionData } = await supabaseClient.auth.getSession()
          const accessToken = sessionData.session?.access_token
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
          if (accessToken && supabaseUrl && supabaseKey) {
            void fetch(`${supabaseUrl}/functions/v1/mark-member-joined`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: supabaseKey,
                'x-landi-auth': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ planIds: joinedPlanIds }),
            })
          }
        }
      }
      if (showLoading) setIsSharedPlansLoading(false)
    }

    void loadSharedPlans(true)
    const channel = supabaseClient.channel('landi-plans-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => void loadSharedPlans()).subscribe()
    return () => {
      active = false
      void supabaseClient.removeChannel(channel)
    }
  }, [authUser, setAuthError, setPlans, setSelectedPlanId])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(plans))
  }, [plans, storageKey])

  useEffect(() => {
    if (applyingRemotePlansRef.current) {
      applyingRemotePlansRef.current = false
      return
    }
    if (!supabase || !authUser) return
    const supabaseClient = supabase

    const ownerPlans = plans.filter((plan) => getPlanRole(plan, authUser) === 'owner')
    const editorPlans = plans.filter((plan) => getPlanRole(plan, authUser) === 'editor')
    if (ownerPlans.length === 0 && editorPlans.length === 0) return

    if (remoteSaveDebounceRef.current) window.clearTimeout(remoteSaveDebounceRef.current)
    remoteSaveDebounceRef.current = window.setTimeout(() => {
      void (async () => {
        const saveSequence = saveSequenceRef.current + 1
        saveSequenceRef.current = saveSequence
        if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
        saveStatusTimerRef.current = window.setTimeout(() => {
          if (saveSequenceRef.current === saveSequence) setSaveStatus('saving')
        }, 700)
        const ownerRows = ownerPlans.map((plan) => planToSharedRow(plan, authUser))
        if (ownerRows.length > 0) {
          const { error } = await supabaseClient
            .from('plans')
            .upsert(ownerRows, { onConflict: 'id' })
          if (error) {
            if (saveSequenceRef.current === saveSequence) {
              if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
              saveStatusTimerRef.current = null
              setSaveStatus('error')
              setAuthError(`공유 조감도를 저장하지 못했습니다. ${error.message}`)
            }
            return
          }
        }

        for (const plan of editorPlans) {
          const row = planToSharedRow(plan, authUser)
          const { error } = await supabaseClient
            .from('plans')
            .update({
              title: row.title,
              data: row.data,
              access_emails: row.access_emails,
              members: row.members,
              updated_at: row.updated_at,
            })
            .eq('id', row.id)
          if (error) {
            if (saveSequenceRef.current === saveSequence) {
              if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
              saveStatusTimerRef.current = null
              setSaveStatus('error')
              setAuthError(`공유 조감도를 저장하지 못했습니다. ${error.message}`)
            }
            return
          }
        }
        if (saveSequenceRef.current === saveSequence) {
          if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
          saveStatusTimerRef.current = null
          setSaveStatus('saved')
          setAuthError((current) => current.startsWith('공유 조감도를 저장하지 못했습니다.') ? '' : current)
        }
      })()
    }, 900)

    return () => {
      if (remoteSaveDebounceRef.current) {
        window.clearTimeout(remoteSaveDebounceRef.current)
        remoteSaveDebounceRef.current = null
      }
    }
  }, [plans, authUser, setAuthError, setSaveStatus])

  useEffect(() => () => {
    if (remoteSaveDebounceRef.current) window.clearTimeout(remoteSaveDebounceRef.current)
    if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
  }, [])

  return { isSharedPlansLoading }
}
