import type { ReactNode } from 'react'
import { Eye, ImagePlus, Layers, Pencil, Plus, Trash2, Trees } from 'lucide-react'
import { getPlanRole, type LandiUser } from '../../lib/supabase'
import type { Plan } from '../../types'

type ListPageProps = {
  authControls: ReactNode
  guideButton: ReactNode
  displayPlans: Plan[]
  plansCount: number
  editablePlanCount: number
  sharedPlanCount: number
  planWithBoardCount: number
  authError: string
  isSupabaseConfigured: boolean
  authUser: LandiUser | null
  actionButtonClass: string
  createNewPlan: () => void
  openPreview: (planId: string) => void
  openEditor: (planId: string) => void
  deletePlan: (planId: string) => void
  getPlanRoleLabel: (role: 'owner' | 'editor' | 'viewer') => string
  getPlanUpdatedLabel: (plan: Plan) => string
  renderThumbnail: (plan: Plan) => ReactNode
}

export function ListPage({
  authControls,
  guideButton,
  displayPlans,
  plansCount,
  editablePlanCount,
  sharedPlanCount,
  planWithBoardCount,
  authError,
  isSupabaseConfigured,
  authUser,
  actionButtonClass,
  createNewPlan,
  openPreview,
  openEditor,
  deletePlan,
  getPlanRoleLabel,
  getPlanUpdatedLabel,
  renderThumbnail,
}: ListPageProps) {
  return (
    <main data-theme="light" className="landi-app min-h-screen bg-[var(--landi-bg)] px-5 py-6 text-slate-900 md:px-8">
      <header className="mx-auto mb-10 grid max-w-6xl gap-6 md:mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm">
              <Trees size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Landi</h1>
              <p className="text-sm text-slate-500">조감도 목록</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {authControls}
            {guideButton}
            {displayPlans.length > 0 && (
              <button type="button" onClick={createNewPlan} className={`${actionButtonClass} bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}>
                <Plus size={17} />
                새 조감도 생성
              </button>
            )}
          </div>
        </div>

        {displayPlans.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">조감도</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-[24px] font-semibold leading-none text-slate-950">{plansCount}</p>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">전체</span>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">편집 권한</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-[24px] font-semibold leading-none text-slate-950">{editablePlanCount}</p>
                <span className="rounded-md bg-[var(--landi-primary-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--landi-primary)]">수정 가능</span>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">공유 / 도면 업로드</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-[24px] font-semibold leading-none text-slate-950">{sharedPlanCount} / {planWithBoardCount}</p>
                <span className="rounded-md bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">공유 / 업로드</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {authError && (
        <div className="mx-auto mb-4 max-w-6xl rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-danger-dark)]" role="alert">
          {authError}
        </div>
      )}
      {!isSupabaseConfigured && (
        <div className="mx-auto mb-4 max-w-6xl rounded-md border border-[var(--landi-warning-border)] bg-[var(--landi-warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-warning-dark)]">
          Supabase 환경 변수를 설정하면 Google 로그인과 멤버 초대가 활성화됩니다.
        </div>
      )}

      <section className={`mx-auto grid max-w-6xl gap-5 ${displayPlans.length === 0 ? 'min-h-[52vh] content-center pt-8 md:pt-12' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {displayPlans.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--landi-accent-copper-border)] bg-white/85 px-5 py-14 text-center shadow-sm md:col-span-2 xl:col-span-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[var(--landi-accent-copper-soft)] text-[var(--landi-accent-copper-dark)]">
              <Layers size={24} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">등록된 조감도가 없습니다</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">새 조감도를 생성한 뒤 도면을 업로드하고 식재 팔레트를 구성해보세요.</p>
            <button type="button" onClick={createNewPlan} className={`${actionButtonClass} mx-auto mt-5 bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}>
              <Plus size={17} />
              새 조감도 생성
            </button>
          </div>
        ) : (
          displayPlans.map((plan) => {
            const cardRole = getPlanRole(plan, authUser)
            const canOpenEditor = cardRole === 'owner' || cardRole === 'editor'
            const roleBadgeClass = cardRole === 'owner'
              ? 'border-[var(--landi-accent-copper-border)] bg-[var(--landi-accent-copper-soft)] text-[var(--landi-accent-copper-dark)]'
              : cardRole === 'editor'
                ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)]'
                : 'border-sky-200 bg-white text-sky-700'
            const roleAccentClass = cardRole === 'owner'
              ? 'bg-[var(--landi-accent-copper)]'
              : cardRole === 'editor'
                ? 'bg-[var(--landi-primary)]'
                : 'bg-sky-400'

            return (
              <article key={plan.id} className="landi-plan-card overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.12)]">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${roleAccentClass}`} aria-hidden="true" />
                        <h2 className="min-w-0 break-words text-[17px] font-semibold leading-6 text-slate-900">{plan.title}</h2>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass}`}>{getPlanRoleLabel(cardRole)}</span>
                        <p className="min-w-0 text-[12px] leading-5 text-slate-500">{getPlanUpdatedLabel(plan)}</p>
                      </div>
                    </div>
                    {cardRole === 'owner' && (
                      <button type="button" onClick={() => deletePlan(plan.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[var(--landi-danger)] transition hover:bg-[var(--landi-danger-soft)]" aria-label="조감도 삭제">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-4 pt-4">{renderThumbnail(plan)}</div>

                <div className="grid gap-4 px-4 pb-4 pt-4">
                  <div className="flex items-center justify-between gap-3 text-[12px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-slate-400" />
                      <span>식재 {plan.plants.length}개</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ImagePlus size={14} className="text-slate-400" />
                      <span>{plan.backgroundUrl ? '도면 업로드 완료' : '도면 없음'}</span>
                    </div>
                  </div>

                  <div className={`grid gap-2 ${canOpenEditor ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button type="button" onClick={() => openPreview(plan.id)} className={`${actionButtonClass} w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
                      <Eye size={17} />
                      미리보기
                    </button>
                    {canOpenEditor && (
                      <button type="button" onClick={() => openEditor(plan.id)} className={`${actionButtonClass} w-full bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}>
                        <Pencil size={17} />
                        편집보드
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}
