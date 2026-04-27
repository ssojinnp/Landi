import type { ReactNode } from 'react'

type InspectorPanel = 'share' | 'board' | 'schedule'

type EditorToolPanelProps = {
  activeToolPanel: InspectorPanel | null
  toolPanelLabel: string
  sharePanel: ReactNode
  boardPanel: ReactNode
  schedulePanel: ReactNode
}

export function EditorToolPanel({ activeToolPanel, toolPanelLabel, sharePanel, boardPanel, schedulePanel }: EditorToolPanelProps) {
  if (!activeToolPanel) return null

  return (
    <section className={`min-h-0 flex-1 px-4 py-3 md:px-5 lg:w-[286px] lg:flex-none ${activeToolPanel === 'schedule' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">{toolPanelLabel}</h2>
      </div>
      {activeToolPanel === 'share' && sharePanel}
      {activeToolPanel === 'board' && boardPanel}
      {activeToolPanel === 'schedule' && schedulePanel}
    </section>
  )
}
