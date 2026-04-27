import { ChevronDown, ChevronUp, ClipboardList, PanelRightClose, PanelRightOpen, SlidersHorizontal, Users } from 'lucide-react'

type InspectorPanel = 'share' | 'board' | 'schedule'

type ToolRailProps = {
  activeToolPanel: InspectorPanel | null
  toolRailButtonClass: (panel: InspectorPanel) => string
  onTogglePanel: (panel: InspectorPanel) => void
  onToggleRightPanel: () => void
}

export function ToolRail({ activeToolPanel, toolRailButtonClass, onTogglePanel, onToggleRightPanel }: ToolRailProps) {
  return (
    <nav className="flex h-12 shrink-0 items-center justify-center gap-1 border-b border-slate-200 px-2 lg:h-full lg:w-14 lg:flex-col lg:justify-start lg:border-b-0 lg:border-r lg:px-2 lg:py-3" aria-label="편집 도구">
      <button type="button" onClick={() => onTogglePanel('share')} className={toolRailButtonClass('share')} aria-label="공유" title="공유">
        <Users size={18} />
      </button>
      <button type="button" onClick={() => onTogglePanel('board')} className={toolRailButtonClass('board')} aria-label="보드 설정" title="보드 설정">
        <SlidersHorizontal size={18} />
      </button>
      <button type="button" onClick={() => onTogglePanel('schedule')} className={toolRailButtonClass('schedule')} aria-label="수량 집계" title="수량 집계">
        <ClipboardList size={18} />
      </button>
      <span className="mx-1 h-6 w-px bg-slate-200 lg:mx-0 lg:my-1 lg:h-px lg:w-8" aria-hidden="true" />
      <button type="button" onClick={onToggleRightPanel} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label={activeToolPanel ? '우측 패널 접기' : '우측 패널 펼치기'} title={activeToolPanel ? '우측 패널 접기' : '우측 패널 펼치기'}>
        {activeToolPanel ? (
          <>
            <ChevronUp size={17} className="lg:hidden" />
            <PanelRightClose size={17} className="hidden lg:block" />
          </>
        ) : (
          <>
            <ChevronDown size={17} className="lg:hidden" />
            <PanelRightOpen size={17} className="hidden lg:block" />
          </>
        )}
      </button>
    </nav>
  )
}
