import { useCallback } from 'react'
import { getEditorMetadata } from '../lib/planHelpers'
import { normalizePlanForUser, planToSharedRow, supabase, type LandiUser } from '../lib/supabase'
import type { Plan, PlanRole } from '../types'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type UsePlanAccessActionsOptions = {
  selectedPlan?: Plan
  authUser: LandiUser | null
  canManageSelectedPlan: boolean
  inviteEmail: string
  inviteRole: Exclude<PlanRole, 'owner'>
  setInviteError: (value: string) => void
  setInviteStatus: (value: string) => void
  setInviteEmail: (value: string) => void
  setIsInviting: (value: boolean) => void
  updateSelectedPlan: (updates: Partial<Plan>) => void
}

export function usePlanAccessActions({
  selectedPlan,
  authUser,
  canManageSelectedPlan,
  inviteEmail,
  inviteRole,
  setInviteError,
  setInviteStatus,
  setInviteEmail,
  setIsInviting,
  updateSelectedPlan,
}: UsePlanAccessActionsOptions) {
  const persistMemberAccess = useCallback(async (nextPlan: Plan, successMessage: string) => {
    if (!supabase || !authUser) {
      setInviteStatus(successMessage)
      return
    }

    const { error } = await supabase
      .from('plans')
      .upsert(planToSharedRow(nextPlan, authUser), { onConflict: 'id' })

    if (error) {
      setInviteError(`권한 변경 저장에 실패했습니다. ${error.message}`)
      return
    }

    setInviteError('')
    setInviteStatus(successMessage)
  }, [authUser, setInviteError, setInviteStatus])

  const updateMemberRole = useCallback(async (email: string, role: Exclude<PlanRole, 'owner'>) => {
    if (!selectedPlan || !canManageSelectedPlan || !authUser) return

    const normalizedEmail = email.toLowerCase()
    const nextMembers = (selectedPlan.members ?? []).map((member) =>
      member.email.toLowerCase() === normalizedEmail ? { ...member, role } : member,
    )
    const nextPlan = normalizePlanForUser({ ...selectedPlan, members: nextMembers, updatedAt: new Date().toISOString(), ...getEditorMetadata(authUser) }, authUser)
    updateSelectedPlan({ members: nextMembers })
    await persistMemberAccess(nextPlan, '멤버 권한을 업데이트했습니다.')
  }, [authUser, canManageSelectedPlan, persistMemberAccess, selectedPlan, updateSelectedPlan])

  const removeMember = useCallback(async (email: string) => {
    if (!selectedPlan || !canManageSelectedPlan || !authUser) return

    const normalizedEmail = email.toLowerCase()
    const nextMembers = (selectedPlan.members ?? []).filter((member) => member.email.toLowerCase() !== normalizedEmail)
    const nextAccessEmails = (selectedPlan.accessEmails ?? []).filter((item) => item.toLowerCase() !== normalizedEmail)
    const nextPlan = normalizePlanForUser({ ...selectedPlan, members: nextMembers, accessEmails: nextAccessEmails, updatedAt: new Date().toISOString(), ...getEditorMetadata(authUser) }, authUser)
    updateSelectedPlan({ members: nextMembers, accessEmails: nextAccessEmails })
    await persistMemberAccess(nextPlan, '멤버 접근 권한을 삭제했습니다.')
  }, [authUser, canManageSelectedPlan, persistMemberAccess, selectedPlan, updateSelectedPlan])

  const inviteMember = useCallback(async () => {
    if (!selectedPlan || !authUser || !canManageSelectedPlan) return

    const email = inviteEmail.trim().toLowerCase()
    setInviteStatus('')
    if (!email || !emailPattern.test(email)) {
      setInviteError('초대할 이메일을 입력해주세요.')
      return
    }
    if (email === authUser.email.toLowerCase()) {
      setInviteError('소유자 본인은 초대할 수 없습니다.')
      return
    }

    const currentMembers = selectedPlan.members ?? []
    const existingMember = currentMembers.find((member) => member.email.toLowerCase() === email)
    const nextMembers = [
      ...currentMembers.filter((member) => member.email.toLowerCase() !== email),
      {
        id: existingMember?.id ?? `member-${crypto.randomUUID()}`,
        email,
        role: inviteRole,
        invitedAt: existingMember?.invitedAt ?? new Date().toISOString(),
        invitedBy: existingMember?.invitedBy ?? authUser.email,
        status: existingMember?.status ?? 'invited' as const,
        joinedAt: existingMember?.joinedAt,
      },
    ]
    const accessEmails = Array.from(new Set([...(selectedPlan.accessEmails ?? []), selectedPlan.ownerEmail ?? authUser.email, email].map((item) => item.toLowerCase()).filter(Boolean)))
    const nextPlan = normalizePlanForUser({ ...selectedPlan, members: nextMembers, accessEmails, updatedAt: new Date().toISOString(), ...getEditorMetadata(authUser) }, authUser)

    setInviteError('')
    setInviteEmail('')
    updateSelectedPlan({ members: nextMembers, accessEmails })

    if (!supabase) {
      setInviteStatus(existingMember ? '멤버 권한을 업데이트했습니다. Supabase 설정 후에는 메일도 발송됩니다.' : '권한을 추가했습니다. Supabase 설정 후에는 초대 메일도 발송됩니다.')
      return
    }

    setIsInviting(true)
    const { error: saveError } = await supabase
      .from('plans')
      .upsert(planToSharedRow(nextPlan, authUser), { onConflict: 'id' })

    if (saveError) {
      setIsInviting(false)
      setInviteError(`초대 권한 저장에 실패했습니다. ${saveError.message}`)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

    if (!accessToken || !supabaseUrl || !supabaseKey) {
      setIsInviting(false)
      setInviteError('로그인 세션을 확인하지 못해 초대 메일을 발송하지 못했습니다.')
      return
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/invite-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        'x-landi-auth': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ planId: nextPlan.id, email, role: inviteRole, redirectTo: window.location.origin }),
    })
    const data = await response.json().catch(() => null)
    setIsInviting(false)

    if (!response.ok) {
      const message = data?.error ?? data?.message ?? response.statusText
      setInviteError(`권한은 추가됐지만 초대 메일 발송에 실패했습니다. ${message}`)
      return
    }
    if (data?.emailSent === false) {
      const detail = data?.detail ? ` 사유: ${data.detail}` : ''
      setInviteStatus(`권한은 추가했습니다. 메일 발송은 실패했지만 대상자는 로그인 후 접근할 수 있습니다.${detail}`)
      return
    }

    setInviteStatus(
      data?.emailKind === 'signin'
        ? '권한을 추가하고 로그인 안내 메일을 발송했습니다.'
        : existingMember
          ? '멤버 권한을 업데이트하고 안내 메일을 발송했습니다.'
          : '초대 메일을 발송했습니다.',
    )
  }, [
    authUser,
    canManageSelectedPlan,
    inviteEmail,
    inviteRole,
    selectedPlan,
    setInviteEmail,
    setInviteError,
    setInviteStatus,
    setIsInviting,
    updateSelectedPlan,
  ])

  return {
    inviteMember,
    updateMemberRole,
    removeMember,
  }
}
