import { Check, Trash2 } from 'lucide-react'

type PlantCategory = '나무' | '풀' | '꽃'

type BoardSettingsPanelProps = {
  canUseBoardControls: boolean
  canEditSelectedPlan: boolean
  hasPlanBackground: boolean
  backgroundFade: number
  backgroundSaturation: number
  plantIntensity: number
  showPlantLabels: boolean
  plantCategories: PlantCategory[]
  visiblePlantCategories: Record<PlantCategory, boolean>
  selectedPlantCount: number
  setIsClearPlantsConfirmOpen: (open: boolean) => void
  updateBackgroundFade: (value: number) => void
  updateBackgroundSaturation: (value: number) => void
  updatePlantIntensity: (value: number) => void
  toggleShowPlantLabels: () => void
  togglePlantCategoryVisibility: (category: PlantCategory) => void
}

export function BoardSettingsPanel({
  canUseBoardControls,
  canEditSelectedPlan,
  hasPlanBackground,
  backgroundFade,
  backgroundSaturation,
  plantIntensity,
  showPlantLabels,
  plantCategories,
  visiblePlantCategories,
  selectedPlantCount,
  setIsClearPlantsConfirmOpen,
  updateBackgroundFade,
  updateBackgroundSaturation,
  updatePlantIntensity,
  toggleShowPlantLabels,
  togglePlantCategoryVisibility,
}: BoardSettingsPanelProps) {
  return (
    <div className="grid gap-3">
      {!canUseBoardControls && (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-500 shadow-sm">
          {canEditSelectedPlan ? '도면 업로드 후 보드 설정과 식재 배치 기능을 사용할 수 있습니다.' : '읽기전용 권한에서는 보드 설정을 변경할 수 없습니다.'}
        </div>
      )}

      <div className={`grid gap-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200 ${!canUseBoardControls ? 'opacity-60' : ''}`}>
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">도면</h3>
        <label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
          <span className="flex items-center justify-between">
            <span>밝기</span>
            <span className="text-[11px] font-semibold text-slate-400">{backgroundFade}%</span>
          </span>
          <input type="range" min="0" max="100" value={backgroundFade} onChange={(event) => updateBackgroundFade(Number(event.target.value))} disabled={!canUseBoardControls} className="landi-range disabled:cursor-not-allowed" />
        </label>
        <label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
          <span className="flex items-center justify-between">
            <span>채도</span>
            <span className="text-[11px] font-semibold text-slate-400">{backgroundSaturation}%</span>
          </span>
          <input type="range" min="0" max="100" value={backgroundSaturation} onChange={(event) => updateBackgroundSaturation(Number(event.target.value))} disabled={!canUseBoardControls} className="landi-range disabled:cursor-not-allowed" />
        </label>
      </div>

      <div className={`grid gap-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200 ${!canUseBoardControls ? 'opacity-60' : ''}`}>
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">식재</h3>
        <label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
          <span className="flex items-center justify-between">
            <span>진하기</span>
            <span className="text-[11px] font-semibold text-slate-400">{plantIntensity}%</span>
          </span>
          <input type="range" min="0" max="100" value={plantIntensity} onChange={(event) => updatePlantIntensity(Number(event.target.value))} disabled={!canUseBoardControls} className="landi-range disabled:cursor-not-allowed" />
        </label>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">식재 이름 라벨</span>
            <span className="text-[11px] font-semibold text-slate-400">{showPlantLabels ? '표시' : '숨김'}</span>
          </div>
          <button type="button" onClick={toggleShowPlantLabels} disabled={!canUseBoardControls} className={`landi-type-toggle flex h-7 items-center justify-between rounded-md border px-2 transition ${showPlantLabels ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)] shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-700'} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:text-inherit`} aria-pressed={showPlantLabels}>
            <span className="flex items-center gap-1.5">
              <span className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border ${showPlantLabels ? 'border-[var(--landi-primary)] bg-[var(--landi-primary)] text-white' : 'border-slate-300 bg-white text-transparent'}`} aria-hidden="true">
                {showPlantLabels && <Check size={10} strokeWidth={3} />}
              </span>
              <span className="text-[12px] font-medium">대표 이름 표시</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-400">대표 1개</span>
          </button>
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">보이는 식재 유형</span>
            <span className="text-[11px] font-semibold text-slate-400">{plantCategories.filter((category) => visiblePlantCategories[category] ?? true).length}/{plantCategories.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {plantCategories.map((category) => {
              const isActive = visiblePlantCategories[category] ?? true
              return (
                <button key={category} type="button" onClick={() => togglePlantCategoryVisibility(category)} disabled={!canUseBoardControls} className={`landi-type-toggle flex h-7 items-center justify-center gap-1 rounded-md border px-1 transition ${isActive ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)] shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-700'} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:text-inherit`} aria-pressed={isActive}>
                  <span className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border ${isActive ? 'border-[var(--landi-primary)] bg-[var(--landi-primary)] text-white' : 'border-slate-300 bg-white text-transparent'}`} aria-hidden="true">
                    {isActive && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="text-[12px] font-medium">{category}</span>
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-[12px] leading-5 text-slate-500">이름 라벨은 같은 식재가 여러 개 있어도 대표 1개만 표시합니다. 선택한 유형만 도면과 내보내기에 남습니다.</p>
      </div>

      {canEditSelectedPlan && (
        <div className={`grid gap-2 rounded-md border border-[var(--landi-danger-border)] bg-white p-3 shadow-sm ${!hasPlanBackground ? 'opacity-60' : ''}`}>
          <div>
            <p className="text-[13px] font-semibold text-[var(--landi-danger)]">배치 식재 삭제</p>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">도면 위에 배치된 식재만 삭제됩니다. 식재 팔레트와 도면은 유지됩니다.</p>
          </div>
          <button type="button" onClick={() => setIsClearPlantsConfirmOpen(true)} disabled={!hasPlanBackground || selectedPlantCount === 0} className="landi-form-control inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--landi-danger-border)] bg-white px-3 text-[12px] font-semibold text-[var(--landi-danger)] shadow-sm transition hover:bg-[var(--landi-danger-soft)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white">
            <Trash2 size={15} />
            식재 모두 삭제
          </button>
        </div>
      )}
    </div>
  )
}
