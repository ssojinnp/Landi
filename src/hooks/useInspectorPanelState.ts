import { useCallback, useState } from 'react'

export type InspectorPanel = 'share' | 'board' | 'schedule'

export function useInspectorPanelState() {
  const [activeToolPanel, setActiveToolPanel] = useState<InspectorPanel | null>(null)

  const toolPanelLabel =
    activeToolPanel === 'share'
      ? '공유'
      : activeToolPanel === 'board'
        ? '보드 설정'
        : activeToolPanel === 'schedule'
          ? '수량 집계'
          : ''

  const toolRailButtonClass = useCallback(
    (panel: InspectorPanel) =>
      `grid h-10 w-10 place-items-center rounded-md border text-sm transition ${
        activeToolPanel === panel
          ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)] shadow-sm'
          : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700'
      }`,
    [activeToolPanel],
  )

  const toggleToolPanel = useCallback((panel: InspectorPanel) => {
    setActiveToolPanel((current) => (current === panel ? null : panel))
  }, [])

  const toggleRightPanel = useCallback(() => {
    setActiveToolPanel((current) => (current ? null : 'share'))
  }, [])

  return {
    activeToolPanel,
    toolPanelLabel,
    toolRailButtonClass,
    toggleToolPanel,
    toggleRightPanel,
  }
}
