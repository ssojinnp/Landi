type OrientationLockDialogProps = {
  open: boolean
  isMobileViewport: boolean
  actionButtonClass: string
  onContinuePortrait: () => void
}

export function OrientationLockDialog({ open, isMobileViewport, actionButtonClass, onContinuePortrait }: OrientationLockDialogProps) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="orientation-lock-title">
      <div className="w-full max-w-[420px] rounded-md border border-white/70 bg-white px-5 py-5 text-center shadow-[0_24px_70px_rgba(15,23,42,0.35)]">
        <p id="orientation-lock-title" className="text-lg font-semibold text-slate-950">가로모드에 최적화되어 있습니다</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">태블릿을 가로로 돌리면 도면과 식재 위치를 더 넓고 정확하게 편집할 수 있습니다.</p>
        {!isMobileViewport && <button type="button" onClick={onContinuePortrait} className={`${actionButtonClass} mt-4 bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}>세로에서 계속하기</button>}
      </div>
    </div>
  )
}
