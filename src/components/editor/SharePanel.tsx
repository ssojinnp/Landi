import { Trash2 } from 'lucide-react'
import type { Plan, PlanMember, PlanRole } from '../../types'

type SharePanelProps = {
  selectedPlan: Plan
  selectedPlanRole: PlanRole
  ownerLabel: string
  roleLabel: string
  authUserEmail?: string
  canManageSelectedPlan: boolean
  inviteEmail: string
  inviteRole: Exclude<PlanRole, 'owner'>
  inviteError: string
  inviteStatus: string
  isInviting: boolean
  setInviteEmail: (value: string) => void
  clearInviteFeedback: () => void
  setInviteRole: (role: Exclude<PlanRole, 'owner'>) => void
  inviteMember: () => void
  updateMemberRole: (email: string, role: Exclude<PlanRole, 'owner'>) => void
  removeMember: (email: string) => void
  getMemberInitial: (email: string) => string
  getMemberRoleLabel: (role: Exclude<PlanRole, 'owner'>) => string
  getMemberStatusLabel: (status: PlanMember['status']) => string
}

export function SharePanel({
  selectedPlan,
  selectedPlanRole,
  ownerLabel,
  roleLabel,
  authUserEmail,
  canManageSelectedPlan,
  inviteEmail,
  inviteRole,
  inviteError,
  inviteStatus,
  isInviting,
  setInviteEmail,
  clearInviteFeedback,
  setInviteRole,
  inviteMember,
  updateMemberRole,
  removeMember,
  getMemberInitial,
  getMemberRoleLabel,
  getMemberStatusLabel,
}: SharePanelProps) {
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-[var(--landi-accent-copper-border)] bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-5 text-slate-800">프로젝트 공유</p>
            <p className="mt-0.5 truncate text-[12px] text-slate-500" title={ownerLabel}>{ownerLabel}</p>
          </div>
          <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${selectedPlanRole === 'owner' ? 'bg-[var(--landi-accent-copper-soft)] text-[var(--landi-accent-copper-dark)]' : selectedPlanRole === 'editor' ? 'bg-[var(--landi-primary-soft)] text-[var(--landi-primary)]' : 'bg-slate-100 text-slate-500'}`}>{roleLabel}</span>
        </div>
      </div>

      {authUserEmail ? (
        <>
          {canManageSelectedPlan ? (
            <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
              <input
                value={inviteEmail}
                onChange={(event) => {
                  setInviteEmail(event.target.value)
                  clearInviteFeedback()
                }}
                placeholder="이메일로 초대"
                className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 px-2.5 outline-none focus:border-[var(--landi-primary)]"
              />
              <p className="text-[12px] leading-5 text-slate-500">Google 로그인에 사용할 수 있는 이메일만 초대할 수 있습니다.</p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Exclude<PlanRole, 'owner'>)} className="landi-form-control h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 outline-none focus:border-[var(--landi-primary)]">
                  <option value="viewer">읽기전용</option>
                  <option value="editor">수정가능</option>
                </select>
                <button type="button" onClick={inviteMember} disabled={isInviting} className="landi-form-control inline-flex h-9 min-w-[54px] items-center justify-center rounded-md bg-[var(--landi-accent-copper)] px-3 text-white shadow-sm transition hover:bg-[var(--landi-accent-copper-dark)] disabled:cursor-wait disabled:opacity-70">
                  {isInviting ? '발송중' : '초대'}
                </button>
              </div>
              {inviteError && <p className="text-[12px] font-semibold text-[var(--landi-danger)]" role="alert">{inviteError}</p>}
              {inviteStatus && <p className="text-[12px] font-semibold text-[var(--landi-primary)]" role="status">{inviteStatus}</p>}
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-[13px] leading-6 text-slate-500 shadow-sm">
              {selectedPlanRole === 'viewer' ? '읽기전용 권한에서는 프로젝트 공유와 초대를 변경할 수 없습니다.' : '초대와 권한 변경은 소유자만 할 수 있습니다.'}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-[13px] leading-6 text-slate-500 shadow-sm">
          Google 로그인 후 조감도를 공유할 수 있습니다.
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">멤버</h3>
          <span className="text-[11px] font-semibold text-slate-400">{(selectedPlan.members ?? []).length}</span>
        </div>

        {(selectedPlan.members ?? []).length > 0 ? (
          (selectedPlan.members ?? []).map((member) => (
            <div key={member.email} className="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[var(--landi-primary-soft)] text-[11px] font-bold text-[var(--landi-primary)]" title={member.email} aria-hidden="true">
                {getMemberInitial(member.email)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold leading-4 text-slate-500">{getMemberStatusLabel(member.status)}</p>
                <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-slate-500">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${member.status === 'joined' ? 'bg-[var(--landi-primary)]' : 'bg-slate-300'}`} aria-hidden="true" />
                  <span>{getMemberRoleLabel(member.role)}</span>
                </p>
              </div>
              {canManageSelectedPlan && (
                <div className="flex shrink-0 items-center gap-1">
                  <select value={member.role} onChange={(event) => updateMemberRole(member.email, event.target.value as Exclude<PlanRole, 'owner'>)} className="landi-compact-control h-8 w-[58px] rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-600 outline-none transition focus:border-[var(--landi-primary)] focus:ring-2 focus:ring-[var(--landi-primary)]/10">
                    <option value="viewer">읽기</option>
                    <option value="editor">수정</option>
                  </select>
                  <button type="button" onClick={() => removeMember(member.email)} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-[var(--landi-danger-soft)] hover:text-[var(--landi-danger)]" aria-label={`${member.email} 초대 제거`}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
              <div className="pointer-events-none absolute left-3 top-[calc(100%+6px)] z-30 hidden w-max max-w-[230px] rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block">
                <p className="truncate text-[12px] font-semibold text-slate-800">{member.email}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">{getMemberRoleLabel(member.role)} · {getMemberStatusLabel(member.status)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-white/70 px-3 py-4 text-[12px] text-slate-400">아직 초대된 멤버가 없습니다.</div>
        )}
      </div>
    </div>
  )
}
