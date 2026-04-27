import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { StaticPlanBoard } from './StaticPlanBoard'
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../data/plants'
import { EMPTY_PLAN_TITLE } from '../../lib/planHelpers'
import type { Plan } from '../../types'

type PlanThumbnailProps = {
  plan: Plan
}

export function PlanThumbnail({ plan }: PlanThumbnailProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.22)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const updateScale = () => setScale(frame.clientWidth / BOARD_WIDTH)
    updateScale()

    const observer = new ResizeObserver(updateScale)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={frameRef} className="relative aspect-[1120/640] overflow-hidden rounded-md border border-[var(--landi-board-border)] bg-[var(--landi-board)]">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `scale(${scale})` }}>
        <StaticPlanBoard plan={plan} showEmptyState={false} />
      </div>
      {!plan.backgroundUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,rgba(248,250,252,0.08),rgba(248,250,252,0.22))]">
          <div className="w-[min(76%,240px)] rounded-md border border-slate-200 bg-white/92 px-4 py-3 text-center shadow-[0_10px_26px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <div className="mx-auto grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-slate-500">
              <ImagePlus size={16} />
            </div>
            <p className="mt-2 text-[12px] font-semibold text-slate-900">{EMPTY_PLAN_TITLE}</p>
          </div>
        </div>
      )}
    </div>
  )
}
