import type { ChangeEvent, ReactNode } from 'react'
import { Download, ImagePlus, Pencil, RotateCcw } from 'lucide-react'

type EditorHeaderProps = {
  title: string
  canEditSelectedPlan: boolean
  canUndoPlanChange: boolean
  selectedPlanUpdatedLabel: string
  saveStatus: 'saved' | 'saving' | 'error'
  saveStatusLabel: string
  saveStatusClass: string
  authControls: ReactNode
  compactGuideButton: ReactNode
  actionButtonClass: string
  isExporting: boolean
  onTitleChange: (title: string) => void
  onUndo: () => void
  onExport: () => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
}

export function EditorHeader({
  title,
  canEditSelectedPlan,
  canUndoPlanChange,
  selectedPlanUpdatedLabel,
  saveStatus,
  saveStatusLabel,
  saveStatusClass,
  authControls,
  compactGuideButton,
  actionButtonClass,
  isExporting,
  onTitleChange,
  onUndo,
  onExport,
  onUpload,
}: EditorHeaderProps) {
  return (
    <header className="flex h-[64px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[var(--landi-panel)] px-4 py-3 md:px-6">
      <div className="flex min-w-[240px] flex-1 items-center gap-2 overflow-hidden">
        <label className={`group flex h-9 min-w-[180px] max-w-[620px] flex-[1_1_620px] items-center gap-2 rounded-md border px-2 transition ${canEditSelectedPlan ? 'cursor-text border-transparent hover:border-[var(--landi-primary-border)] hover:bg-white/60 focus-within:border-[var(--landi-primary)] focus-within:bg-white/80 focus-within:shadow-sm' : 'cursor-default border-transparent bg-transparent'}`}>
          <span className="sr-only">조감도 제목</span>
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} disabled={!canEditSelectedPlan} className="landi-title-input min-w-[120px] w-full bg-transparent text-[19px] leading-6 tracking-normal text-slate-900 outline-none disabled:cursor-default" aria-label="조감도 제목" />
          <Pencil size={16} className={`shrink-0 text-slate-400 transition ${canEditSelectedPlan ? 'group-hover:text-[var(--landi-primary)]' : 'opacity-0'}`} aria-hidden="true" />
        </label>
        <span className="hidden max-w-[180px] shrink truncate text-[12px] font-medium leading-4 text-slate-500 xl:inline">{selectedPlanUpdatedLabel}</span>
        {saveStatus !== 'saved' && <span className={`hidden shrink-0 text-[12px] font-medium leading-4 xl:inline ${saveStatusClass}`} role="status">{saveStatusLabel}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {authControls}
        {compactGuideButton}
        {canEditSelectedPlan && (
          <button
            type="button"
            title="되돌리기"
            aria-label="되돌리기"
            onClick={onUndo}
            disabled={!canUndoPlanChange}
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:shadow-none disabled:hover:bg-white"
          >
            <RotateCcw size={17} />
          </button>
        )}
        <button type="button" onClick={onExport} disabled={isExporting} className={`${actionButtonClass} bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)] disabled:cursor-wait disabled:opacity-70`}>
          <Download size={17} />
          {isExporting ? '내보내는 중' : '내보내기'}
        </button>
        {canEditSelectedPlan && (
          <label title="도면 업로드" aria-label="도면 업로드" className="grid h-10 w-10 cursor-pointer place-items-center rounded-md bg-[var(--landi-accent-copper)] text-white shadow-sm transition hover:bg-[var(--landi-accent-copper-dark)]">
            <ImagePlus size={18} />
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} className="sr-only" />
          </label>
        )}
      </div>
    </header>
  )
}
