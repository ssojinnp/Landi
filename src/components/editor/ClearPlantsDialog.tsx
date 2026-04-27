import { Trash2 } from 'lucide-react'

type ClearPlantsDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ClearPlantsDialog({ open, onClose, onConfirm }: ClearPlantsDialogProps) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-5 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="clear-plants-title">
      <div className="w-full max-w-[360px] rounded-md border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--landi-danger-soft)] text-[var(--landi-danger)]">
            <Trash2 size={19} />
          </div>
          <div className="min-w-0">
            <h2 id="clear-plants-title" className="text-[15px] font-semibold leading-6 text-slate-950">배치된 식재를 모두 제거할까요?</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-slate-500">도면 위에 배치된 식재만 삭제됩니다. 식재 팔레트와 도면은 유지됩니다.</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50">취소</button>
          <button type="button" onClick={onConfirm} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md bg-[var(--landi-danger)] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[var(--landi-danger-dark)]">모두 제거</button>
        </div>
      </div>
    </div>
  )
}
