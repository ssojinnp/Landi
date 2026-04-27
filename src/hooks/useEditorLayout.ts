import { useEffect, useState, type RefObject } from 'react'
import { BOARD_WIDTH } from '../data/plants'

type UseEditorLayoutOptions = {
  mode: string
  hasSelectedPlan: boolean
  boardFrameRef: RefObject<HTMLDivElement | null>
}

export function useEditorLayout({ mode, hasSelectedPlan, boardFrameRef }: UseEditorLayoutOptions) {
  const [boardScale, setBoardScale] = useState(1)
  const [viewport, setViewport] = useState(() => ({ width: typeof window === 'undefined' ? 1440 : window.innerWidth, height: typeof window === 'undefined' ? 900 : window.innerHeight }))
  const [allowPortraitEditing, setAllowPortraitEditing] = useState(false)

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)
    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  useEffect(() => {
    const frame = boardFrameRef.current
    if (!frame) return

    const updateScale = () => {
      const frameStyle = window.getComputedStyle(frame)
      const horizontalPadding = parseFloat(frameStyle.paddingLeft) + parseFloat(frameStyle.paddingRight)
      const availableWidth = Math.max(0, frame.clientWidth - horizontalPadding)
      setBoardScale(Math.min(1, availableWidth / BOARD_WIDTH))
    }

    updateScale()

    const observer = new ResizeObserver(updateScale)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [boardFrameRef, mode])

  const isMobileViewport = viewport.width < 768
  const isTabletPortrait = viewport.width >= 768 && viewport.width < 1280 && viewport.height > viewport.width
  const shouldShowOrientationLock = mode === 'edit' && hasSelectedPlan && (isMobileViewport || (isTabletPortrait && !allowPortraitEditing))

  return {
    boardScale,
    viewport,
    allowPortraitEditing,
    setAllowPortraitEditing,
    isMobileViewport,
    isTabletPortrait,
    shouldShowOrientationLock,
  }
}
