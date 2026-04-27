type EditorStatusBannersProps = {
  authError: string
  exportError: string
  canEditSelectedPlan: boolean
}

export function EditorStatusBanners({ authError, exportError, canEditSelectedPlan }: EditorStatusBannersProps) {
  return (
    <>
      {authError && <div className="mx-4 mt-3 rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-danger-dark)]" role="alert">{authError}</div>}
      {!canEditSelectedPlan && <div className="mx-4 mt-3 rounded-md border border-[var(--landi-warning-border)] bg-[var(--landi-warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-warning-dark)]">읽기전용 권한입니다. 조감도 확인과 이미지 내보내기만 사용할 수 있습니다.</div>}
      {exportError && <div className="mx-4 mt-3 rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-danger-dark)]" role="alert">{exportError}</div>}
    </>
  )
}
