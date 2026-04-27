import { PlantSymbol } from '../canvas/PlantSymbol'
import type { PlantTemplate } from '../../types'

type GroupedInventorySection = {
  label: string | null
  items: PlantTemplate[]
}

type GroupedInventoryGroup = {
  category: string
  label: string
  total: number
  items: PlantTemplate[]
  colors: PlantTemplate['colors']
}

type SchedulePanelProps = {
  totalPlants: number
  groupedInventory: GroupedInventoryGroup[]
  groupTreeScaleItems: <T extends Pick<PlantTemplate, 'kind'>>(items: T[]) => Array<{ label: string | null; items: T[] }>
}

function InventoryPlantIcon({ plant }: { plant: PlantTemplate }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--landi-panel)] ring-1 ring-slate-200">
      <PlantSymbol plant={{ ...plant, size: 24 }} />
    </div>
  )
}

export function SchedulePanel({ totalPlants, groupedInventory, groupTreeScaleItems }: SchedulePanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="shrink-0 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">배치 수량</span>
          <span className="rounded-md bg-[var(--landi-primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--landi-primary)]">총 {totalPlants}</span>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-slate-500">도면에 배치된 식재를 유형별로 자동 집계해 보여줍니다.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {groupedInventory.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-3">
            {groupedInventory.map((group) => (
              <section key={group.category} className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.colors.primary }} />
                    <h3 className="truncate text-[12px] font-semibold uppercase tracking-wide text-slate-500">{group.label}</h3>
                  </div>
                  <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">{group.total}</span>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-2">
                  {(group.category === '나무' ? groupTreeScaleItems(group.items) : [{ label: null, items: group.items }]).map((section: GroupedInventorySection) => (
                    <div key={section.label ?? group.category} className="grid min-w-0 gap-1.5">
                      {section.label && <div className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{section.label}</div>}
                      {section.items.map((item) => (
                        <div key={item.id} className="group relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
                          <InventoryPlantIcon plant={item} />
                          <div className="min-w-0 overflow-hidden">
                            <p className="truncate text-sm font-semibold leading-5 text-slate-800" title={item.name}>{item.name}</p>
                            <p className="botanical-name truncate text-xs leading-4 text-slate-500" title={item.label}>{item.label}</p>
                          </div>
                          <span className="shrink-0 text-lg font-semibold text-slate-900">{(item as PlantTemplate & { count: number }).count}</span>
                          <div className="pointer-events-none absolute left-3 top-[calc(100%+6px)] z-30 hidden w-max max-w-[230px] rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block">
                            <p className="truncate text-[12px] font-semibold text-slate-800">{item.name}</p>
                            <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{item.label}</p>
                            <p className="mt-1 text-[11px] font-semibold text-[var(--landi-primary)]">{section.label ? `${group.label} · ${section.label}` : group.label} · 수량 {(item as PlantTemplate & { count: number }).count}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-[180px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-white/70 px-3 py-8 text-[12px] leading-5 text-slate-400">아직 도면에 배치된 식재가 없습니다.</div>
        )}
      </div>
    </div>
  )
}
