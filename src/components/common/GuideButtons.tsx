import { HelpCircle } from 'lucide-react'

type GuideButtonProps = {
  actionButtonClass: string
  onOpenGuide: () => void
}

export function GuideButton({ actionButtonClass, onOpenGuide }: GuideButtonProps) {
  return (
    <button type="button" onClick={onOpenGuide} className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
      <HelpCircle size={17} />
      시작 가이드
    </button>
  )
}

type CompactGuideButtonProps = {
  onOpenGuide: () => void
}

export function CompactGuideButton({ onOpenGuide }: CompactGuideButtonProps) {
  return (
    <button type="button" onClick={onOpenGuide} title="시작 가이드" aria-label="시작 가이드" className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50">
      <HelpCircle size={17} />
    </button>
  )
}
