import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Pencil, Plus, Sprout, Trash2 } from 'lucide-react'
import { PlantSymbol } from '../canvas/PlantSymbol'
import { flowerColorOptions, kindOptions, plantAssetSlotCount } from '../../data/plants'
import type { Plan, PlantKind, PlantTemplate } from '../../types'

type PalettePanelProps = {
  selectedPlan: Plan
  hasPlanBackground: boolean
  canEditSelectedPlan: boolean
  canPlacePlants: boolean
  editingTemplateId: string | null
  isPaletteFormVisible: boolean
  newPlantKind: PlantKind
  newPlantName: string
  newPlantLabel: string
  newFlowerColor: string
  paletteFormError: string
  setIsPaletteFormOpen: (updater: (open: boolean) => boolean) => void
  setNewPlantKind: (kind: PlantKind) => void
  setNewPlantName: (value: string) => void
  setNewPlantLabel: (value: string) => void
  setNewFlowerColor: (value: string) => void
  clearPaletteFormError: () => void
  addTemplateToPalette: () => void
  resetPaletteForm: () => void
  handlePaletteFormKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  addPlant: (template: PlantTemplate) => void
  startEditTemplate: (template: PlantTemplate) => void
  deleteTemplateFromPalette: (templateId: string) => void
  isTreeKind: (kind: PlantKind) => boolean
  groupTreeScaleItems: <T extends Pick<PlantTemplate, 'kind'>>(items: T[]) => Array<{ label: string | null; items: T[] }>
}

export function PalettePanel({
  selectedPlan,
  hasPlanBackground,
  canEditSelectedPlan,
  canPlacePlants,
  editingTemplateId,
  isPaletteFormVisible,
  newPlantKind,
  newPlantName,
  newPlantLabel,
  newFlowerColor,
  paletteFormError,
  setIsPaletteFormOpen,
  setNewPlantKind,
  setNewPlantName,
  setNewPlantLabel,
  setNewFlowerColor,
  clearPaletteFormError,
  addTemplateToPalette,
  resetPaletteForm,
  handlePaletteFormKeyDown,
  addPlant,
  startEditTemplate,
  deleteTemplateFromPalette,
  isTreeKind,
  groupTreeScaleItems,
}: PalettePanelProps) {
  const selectedKindOption = kindOptions.find((option) => option.kind === newPlantKind) ?? kindOptions[0]
  const editingTemplate = editingTemplateId ? selectedPlan.palette.find((template) => template.id === editingTemplateId) : undefined
  const sameKindTemplates = selectedPlan.palette.filter((template) => template.kind === newPlantKind && template.id !== editingTemplateId)
  const usedAssetSlots = new Set(sameKindTemplates.map((template) => template.assetVariant).filter((value): value is number => value !== undefined))
  const usedToneSlots = new Set(sameKindTemplates.map((template) => template.toneVariant).filter((value): value is number => value !== undefined))
  const pickPreviewSlot = (usedSlots: Set<number>, slotCount: number, seed: number) => {
    for (let offset = 0; offset < slotCount; offset += 1) {
      const candidate = (seed + offset) % slotCount
      if (!usedSlots.has(candidate)) return candidate
    }
    return seed % slotCount
  }
  const nextAssetVariant = editingTemplate?.kind === newPlantKind && editingTemplate.assetVariant !== undefined
    ? editingTemplate.assetVariant
    : pickPreviewSlot(usedAssetSlots, plantAssetSlotCount[newPlantKind], sameKindTemplates.length)
  const nextToneVariant = editingTemplate?.kind === newPlantKind && editingTemplate.toneVariant !== undefined
    ? editingTemplate.toneVariant
    : pickPreviewSlot(usedToneSlots, 13, sameKindTemplates.length * 3)
  const previewTemplate: PlantTemplate = {
    id: `preview-${newPlantKind}-${nextAssetVariant}-${nextToneVariant}`,
    kind: newPlantKind,
    category: selectedKindOption.category,
    name: newPlantName.trim() || selectedKindOption.label,
    label: newPlantLabel.trim() || selectedKindOption.label,
    size: selectedKindOption.size,
    colors: newPlantKind === 'flower' ? { ...selectedKindOption.colors, accent: newFlowerColor } : selectedKindOption.colors,
    assetVariant: nextAssetVariant,
    toneVariant: nextToneVariant,
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">식재 팔레트</h2>
        <Sprout size={17} className="text-[var(--landi-primary)]" />
      </div>

      {!hasPlanBackground && (
        <div className="mb-3 shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-500 shadow-sm">
          {canEditSelectedPlan ? '도면 업로드 후 식재를 도면 위에 배치할 수 있습니다.' : '읽기전용 권한에서는 식재 배치와 편집 기능을 사용할 수 없습니다.'}
        </div>
      )}

      <div className="mb-3 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => canEditSelectedPlan && setIsPaletteFormOpen((open) => !open)}
          disabled={!canEditSelectedPlan}
          className="landi-form-trigger flex h-10 w-full items-center justify-between gap-3 px-3 text-left font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{editingTemplateId ? '식재 타입 수정' : '식재 타입 등록'}</span>
          <span className="rounded-sm bg-[var(--landi-primary-soft)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--landi-primary)]">{isPaletteFormVisible ? '닫기' : '열기'}</span>
        </button>

        {isPaletteFormVisible && (
          <div onKeyDown={handlePaletteFormKeyDown} className="grid gap-2 border-t border-slate-100 p-3">
            <select value={isTreeKind(newPlantKind) ? 'tree' : newPlantKind} onChange={(event) => setNewPlantKind(event.target.value === 'tree' ? 'deciduous' : event.target.value as PlantKind)} className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 outline-none focus:border-[var(--landi-primary)]">
              <option value="tree">나무</option>
              <option value="groundcover">풀</option>
              <option value="flower">꽃</option>
            </select>

            {isTreeKind(newPlantKind) && (
              <select value={newPlantKind === 'shrub' ? 'shrub' : 'canopy'} onChange={(event) => setNewPlantKind(event.target.value === 'shrub' ? 'shrub' : 'deciduous')} className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 outline-none focus:border-[var(--landi-primary)]">
                <option value="canopy">교목</option>
                <option value="shrub">관목</option>
              </select>
            )}

            <input
              value={newPlantName}
              onChange={(event) => {
                setNewPlantName(event.target.value)
                clearPaletteFormError()
              }}
              placeholder="식재명 예: 라벤더"
              aria-invalid={Boolean(paletteFormError)}
              className={`landi-form-control h-9 w-full min-w-0 rounded-md border px-2.5 outline-none focus:border-[var(--landi-primary)] ${paletteFormError ? 'border-[var(--landi-danger)] bg-[var(--landi-danger-soft)]' : 'border-slate-300'}`}
            />

            {paletteFormError && <p className="text-xs font-semibold text-[var(--landi-danger)]" role="alert">{paletteFormError}</p>}

            {newPlantKind === 'flower' && (
              <div className="rounded-md border border-slate-200 bg-[var(--landi-panel)] p-2">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">꽃 색상</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {flowerColorOptions.map((color) => (
                    <button key={color.value} type="button" onClick={() => setNewFlowerColor(color.value)} title={color.name} className={`h-7 rounded-md border shadow-sm ${newFlowerColor === color.value ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`} style={{ backgroundColor: color.value }} aria-label={`${color.name} 꽃 색상 선택`} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-md border border-slate-200 bg-slate-50/70 p-2">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
                <PlantSymbol plant={{ ...previewTemplate, size: 34 }} />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-slate-700">샘플 {nextAssetVariant + 1}</div>
                <div className="mt-0.5 truncate text-[11.5px] font-medium text-slate-500">동일 타입 안에서 중복을 피해서 자동 배정됩니다.</div>
              </div>
            </div>

            <input
              value={newPlantLabel}
              onChange={(event) => {
                setNewPlantLabel(event.target.value)
                clearPaletteFormError()
              }}
              placeholder="학명/메모 선택"
              className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 px-2.5 outline-none focus:border-[var(--landi-primary)]"
            />

            <button type="button" onClick={addTemplateToPalette} className="landi-form-control inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--landi-primary)] px-3 text-white shadow-sm transition hover:bg-[var(--landi-primary-dark)]">
              <Plus size={16} />
              {editingTemplateId ? '팔레트 수정' : '팔레트 등록'}
            </button>

            {editingTemplateId && (
              <button type="button" onClick={resetPaletteForm} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition hover:bg-slate-50">
                수정 취소
              </button>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {kindOptions.map((group) => {
          const groupTemplates = selectedPlan.palette.filter((template) => template.category === group.category)
          const templateSections = group.category === '나무' ? groupTreeScaleItems(groupTemplates) : [{ label: null, items: groupTemplates }]

          return (
            <section key={group.category} className="mb-4 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.colors.primary }} />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.label}</h3>
                </div>
                <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{groupTemplates.length}</span>
              </div>

              {groupTemplates.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-white/70 px-3 py-4 text-center text-xs text-slate-400">
                  등록된 {group.label} 식재가 없습니다.
                </div>
              ) : (
                <div className="grid gap-2">
                  {templateSections.map((section) => (
                    <div key={section.label ?? group.category} className="grid gap-1.5">
                      {section.label && <div className="px-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{section.label}</div>}
                      <div className="grid gap-1.5 md:grid-cols-2 lg:block lg:space-y-1.5">
                        {section.items.map((template) => (
                          <div key={template.id} className={`group relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border bg-white/80 px-2 py-1.5 transition ${canPlacePlants ? 'border-transparent hover:border-[var(--landi-primary-border)] hover:bg-white hover:shadow-sm' : 'border-transparent opacity-70'}`}>
                            <button
                              type="button"
                              draggable={canPlacePlants}
                              onClick={() => addPlant(template)}
                              onDragStart={(event) => {
                                if (!canPlacePlants) {
                                  event.preventDefault()
                                  return
                                }
                                event.dataTransfer.setData('template-id', template.id)
                              }}
                              disabled={!canPlacePlants}
                              className="flex min-w-0 w-full items-center gap-2 overflow-hidden text-left disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden">
                                <PlantSymbol plant={{ ...template, size: 24 }} />
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="truncate text-sm font-semibold leading-5 text-slate-800" title={template.name}>{template.name}</div>
                                <div className="botanical-name truncate text-xs leading-4 text-slate-500" title={template.label}>{template.label}</div>
                              </div>
                            </button>

                            <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  startEditTemplate(template)
                                }}
                                disabled={!canEditSelectedPlan}
                                className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                                aria-label={`${template.name} 팔레트 수정`}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  deleteTemplateFromPalette(template.id)
                                }}
                                disabled={!canEditSelectedPlan}
                                className="grid h-7 w-7 place-items-center rounded-md text-[var(--landi-danger)] hover:bg-[var(--landi-danger-soft)] hover:text-[var(--landi-danger-dark)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--landi-danger)]"
                                aria-label={`${template.name} 팔레트 삭제`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
