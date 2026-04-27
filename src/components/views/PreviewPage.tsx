import type { ReactNode } from 'react'
import { ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react'
import type { Plan, PlanRole } from '../../types'

type PreviewPageProps = {
  selectedPlan: Plan
  selectedPlanRole: PlanRole
  selectedPlanUpdatedLabel: string
  canOpenSelectedPlanEditor: boolean
  authControls: ReactNode
  compactGuideButton: ReactNode
  authError: string
  isExporting: boolean
  actionButtonClass: string
  onBack: () => void
  onExport: () => void
  onOpenEditor: () => void
  onDelete: () => void
  getPlanRoleLabel: (role: PlanRole) => string
  renderBoard: ReactNode
}

export function PreviewPage({
  selectedPlan,
  selectedPlanRole,
  selectedPlanUpdatedLabel,
  canOpenSelectedPlanEditor,
  authControls,
  compactGuideButton,
  authError,
  isExporting,
  actionButtonClass,
  onBack,
  onExport,
  onOpenEditor,
  onDelete,
  getPlanRoleLabel,
  renderBoard,
}: PreviewPageProps) {
  const roleBadgeClass = selectedPlanRole === 'owner'
    ? 'border-[var(--landi-accent-copper-border)] bg-[var(--landi-accent-copper-soft)] text-[var(--landi-accent-copper-dark)]'
    : selectedPlanRole === 'editor'
      ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)]'
      : 'border-sky-200 bg-white text-sky-700'

  return (
    <main data-theme="light" className="landi-app min-h-screen bg-[var(--landi-bg)] p-5 text-slate-900 md:p-8">
      <header className="mx-auto mb-5 grid max-w-6xl gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-2">
            <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="목록으로" title="목록으로">
              <ArrowLeft size={17} />
            </button>
            <div className="grid gap-1.5">
              <div className="flex min-w-0 flex-wrap items-start gap-2">
                <h1 className="min-w-0 flex-1 break-words text-[22px] font-semibold leading-7 tracking-normal text-slate-900">{selectedPlan.title}</h1>
                <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass}`}>{getPlanRoleLabel(selectedPlanRole)}</span>
              </div>
              <p className="text-[13px] font-medium leading-5 text-slate-500">식재 {selectedPlan.plants.length}개 · {selectedPlanUpdatedLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedPlanRole === 'viewer' && (
              <button type="button" onClick={onExport} disabled={isExporting} className={`${actionButtonClass} bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)] disabled:cursor-wait disabled:opacity-70`}>
                <Download size={17} />
                {isExporting ? '내보내는 중' : '내보내기'}
              </button>
            )}
            {canOpenSelectedPlanEditor && (
              <button type="button" onClick={onOpenEditor} className={`${actionButtonClass} bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}>
                <Pencil size={17} />
                편집보드로
              </button>
            )}
            {compactGuideButton}
            {authControls}
            {selectedPlanRole === 'owner' && (
              <button type="button" onClick={onDelete} className={`${actionButtonClass} border border-[var(--landi-danger-border)] bg-white text-[var(--landi-danger)] hover:bg-[var(--landi-danger-soft)]`}>
                <Trash2 size={17} />
                삭제
              </button>
            )}
          </div>
        </div>

        {selectedPlanRole === 'viewer' && (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-500 shadow-sm">
            읽기전용 조감도는 현재 저장된 상태 그대로 확인하고 이미지로 내보낼 수 있습니다.
          </div>
        )}
      </header>

      {authError && (
        <div className="mx-auto mb-4 max-w-6xl rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-danger-dark)]" role="alert">
          {authError}
        </div>
      )}

      <section className="mx-auto max-w-6xl overflow-auto rounded-md bg-white p-4 shadow-[0_24px_70px_rgba(47,55,43,0.14)]">
        {renderBoard}
      </section>
    </main>
  )
}
