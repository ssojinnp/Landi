import { ArrowLeft, ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, Trees } from 'lucide-react'

type EditorSidebarHeaderProps = {
  isPaletteCollapsed: boolean
  onBack: () => void
  onToggleCollapse: () => void
}

export function EditorSidebarHeader({ isPaletteCollapsed, onBack, onToggleCollapse }: EditorSidebarHeaderProps) {
  return (
    <div className={`flex shrink-0 border-b border-slate-200 ${isPaletteCollapsed ? 'h-12 items-center justify-between px-2 lg:h-auto lg:flex-col lg:items-center lg:justify-start lg:border-b-0 lg:px-2 lg:py-3' : 'h-16 items-center px-4 md:px-5'}`}>
      <div className={`flex min-w-0 items-center ${isPaletteCollapsed ? 'gap-2 lg:flex-col' : 'gap-2.5'}`}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm" title="Landi">
          <Trees size={20} />
        </div>
        <div className={isPaletteCollapsed ? 'hidden' : ''}>
          <h1 className="text-lg font-semibold tracking-normal">Landi</h1>
          <p className="text-[13px] text-slate-500">편집보드</p>
        </div>
      </div>
      {isPaletteCollapsed && <span className="mx-1 h-6 w-px bg-slate-200 lg:mx-0 lg:my-3 lg:h-px lg:w-8" aria-hidden="true" />}
      <div className={`flex items-center gap-1.5 ${isPaletteCollapsed ? 'lg:flex-col' : 'ml-auto'}`}>
        <button type="button" onClick={onBack} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="목록으로" title="목록으로">
          <ArrowLeft size={17} />
        </button>
        <button type="button" onClick={onToggleCollapse} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={isPaletteCollapsed ? '식재 팔레트 펼치기' : '식재 팔레트 접기'} title={isPaletteCollapsed ? '식재 팔레트 펼치기' : '식재 팔레트 접기'}>
          {isPaletteCollapsed ? (
            <>
              <ChevronDown size={17} className="lg:hidden" />
              <PanelLeftOpen size={17} className="hidden lg:block" />
            </>
          ) : (
            <>
              <ChevronUp size={17} className="lg:hidden" />
              <PanelLeftClose size={17} className="hidden lg:block" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
