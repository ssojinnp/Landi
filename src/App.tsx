
import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'
import { ArrowLeft, Check, ChevronDown, ChevronUp, ClipboardList, Download, Eye, HelpCircle, ImagePlus, Layers, LogIn, LogOut, Minus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pencil, Plus, SlidersHorizontal, Sprout, Trash2, Trees, UserRound, Users } from 'lucide-react'
import { PlantSymbol } from './components/canvas/PlantSymbol'
import { BOARD_HEIGHT, BOARD_WIDTH, defaultPalette, flowerColorOptions, kindOptions, plantToneOptions, STORAGE_KEY } from './data/plants'
import { getPlanRole, getSessionUser, isSupabaseConfigured, normalizePlanForUser, planToSharedRow, sharedRowToPlan, supabase, type LandiUser, type SharedPlanRow } from './lib/supabase'
import type { Plan, Plant, PlantKind, PlantTemplate, PlanMember, PlanRole, ViewMode } from './types'

const PLANT_SIZE_MIN = 28
const PLANT_SIZE_MAX = 190
const PLANT_SIZE_STEP = 8
const PLANT_SYMBOL_OFFSET_X = 4
const PLANT_SYMBOL_OFFSET_Y = 3
const EMPTY_PLAN_TITLE = '등록된 도면이 없습니다'
const LEGACY_LIRIOPE_IDS = new Set(['liriope'])
const LEGACY_LIRIOPE_NAMES = new Set(['맥문동'])
const KOCHIA_TEMPLATE = defaultPalette.find((template) => template.id === 'kochia') ?? defaultPalette[3]

function isLegacyLiriopeTemplate(template: Pick<PlantTemplate, 'id' | 'name'>) {
  return LEGACY_LIRIOPE_IDS.has(template.id) || LEGACY_LIRIOPE_NAMES.has(template.name.trim())
}

function migrateTemplate(template: PlantTemplate): PlantTemplate {
  if (!isLegacyLiriopeTemplate(template)) return template
  return {
    ...template,
    id: KOCHIA_TEMPLATE.id,
    kind: KOCHIA_TEMPLATE.kind,
    category: KOCHIA_TEMPLATE.category,
    name: KOCHIA_TEMPLATE.name,
    label: KOCHIA_TEMPLATE.label,
    size: KOCHIA_TEMPLATE.size,
    colors: KOCHIA_TEMPLATE.colors,
  }
}

function migratePlant(plant: Plant): Plant {
  if (!isLegacyLiriopeTemplate(plant) && !LEGACY_LIRIOPE_IDS.has(plant.templateId)) return plant
  return {
    ...plant,
    templateId: KOCHIA_TEMPLATE.id,
    kind: KOCHIA_TEMPLATE.kind,
    category: KOCHIA_TEMPLATE.category,
    name: KOCHIA_TEMPLATE.name,
    label: KOCHIA_TEMPLATE.label,
    size: plant.size ?? KOCHIA_TEMPLATE.size,
    colors: KOCHIA_TEMPLATE.colors,
  }
}

function migratePlan(plan: Plan): Plan {
  const migratedPalette = Array.from(
    new Map(plan.palette.map((template) => {
      const migratedTemplate = migrateTemplate(template)
      return [migratedTemplate.id, migratedTemplate] as const
    })).values(),
  )
  const migratedPlants = plan.plants.map((plant) => migratePlant(plant))
  return {
    ...plan,
    palette: migratedPalette,
    plants: migratedPlants,
  }
}

function createPlan(title = '새 조감도', user?: LandiUser | null): Plan {
  const plan: Plan = { id: `plan-${crypto.randomUUID()}`, title, updatedAt: new Date().toISOString(), ...getEditorMetadata(user), backgroundUrl: null, palette: defaultPalette, plants: [], backgroundFade: 62, backgroundSaturation: 100, plantIntensity: 100, showPlantLabels: false }
  return user ? normalizePlanForUser(plan, user) : plan
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

function clampPlantSize(value: number) {
  return Math.min(PLANT_SIZE_MAX, Math.max(PLANT_SIZE_MIN, value))
}

function getRepresentativeLabelIds(plants: Plant[]) {
  const seenTemplateIds = new Set<string>()
  const labelIds = new Set<string>()

  plants.forEach((plant) => {
    if (seenTemplateIds.has(plant.templateId)) return
    seenTemplateIds.add(plant.templateId)
    labelIds.add(plant.instanceId)
  })

  return labelIds
}

function getExportFormatFromFileName(fileName: string): 'png' | 'jpg' | null {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.png')) return 'png'
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'jpg'
  return null
}

async function canvasToImageBlob(canvas: HTMLCanvasElement, mimeType: string, quality = 0.92) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality))
  if (blob) return blob

  const dataUrl = canvas.toDataURL(mimeType, quality)
  const response = await fetch(dataUrl)
  return response.blob()
}

function loadPlans(): Plan[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved) as Plan[]
    return parsed.map((plan) => migratePlan(plan))
  } catch {
    return []
  }
}

function createTemplate(kind: PlantKind, name: string, label = '', flowerAccent = flowerColorOptions[0].value): PlantTemplate {
  const option = kindOptions.find((item) => item.kind === kind) ?? kindOptions.find((item) => item.category === '나무') ?? kindOptions[0]
  const toneSet = plantToneOptions[kind]
  const generatedTone = toneSet?.[Math.floor(Math.random() * toneSet.length)]
  const colors = kind === 'flower' ? { ...option.colors, accent: flowerAccent } : (generatedTone ?? option.colors)
  const size = kind === 'shrub' ? 58 : option.size
  return { id: `${kind}-${crypto.randomUUID()}`, kind, category: option.category, name: name.trim(), label: label.trim() || option.label, size, colors }
}
type ResizeAnchor = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
type InspectorPanel = 'share' | 'board' | 'schedule'
type SaveStatus = 'saved' | 'saving' | 'error'
type PlantCategory = '나무' | '풀' | '꽃'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const plantCategories: PlantCategory[] = ['나무', '풀', '꽃']
const defaultVisiblePlantCategories: Record<PlantCategory, boolean> = { '나무': true, '풀': true, '꽃': true }

function getEditorMetadata(user?: LandiUser | null) {
  return {
    lastEditedById: user?.id,
    lastEditedByEmail: user?.email,
    lastEditedByName: user?.name ?? (user?.email ? user.email.split('@')[0] : '로컬 사용자'),
  }
}

function formatRelativeTime(isoDate?: string) {
  if (!isoDate) return '수정 정보 없음'
  const diffMs = Date.now() - new Date(isoDate).getTime()
  if (!Number.isFinite(diffMs)) return '수정 정보 없음'
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 1) return '방금 수정'
  if (diffMinutes < 60) return `${diffMinutes}분 전 수정`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}시간 전 수정`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}일 전 수정`
  return new Date(isoDate).toLocaleDateString('ko-KR')
}

function getLastEditorLabel(plan: Plan) {
  return plan.lastEditedByName ?? plan.lastEditedByEmail?.split('@')[0] ?? plan.ownerEmail?.split('@')[0] ?? '로컬 사용자'
}

function getPlanUpdatedLabel(plan: Plan) {
  return `${getLastEditorLabel(plan)} · ${formatRelativeTime(plan.updatedAt)}`
}

function getSaveStatusLabel(status: SaveStatus) {
  if (status === 'saving') return '저장 중'
  if (status === 'error') return '저장 실패'
  return '저장됨'
}

function getSaveStatusClass(status: SaveStatus) {
  if (status === 'saving') return 'text-[var(--landi-warning)]'
  if (status === 'error') return 'text-[var(--landi-danger)]'
  return 'text-slate-400'
}

function getMemberStatusLabel(status: PlanMember['status']) {
  return status === 'joined' ? '참여 완료' : '초대 대기'
}

function getMemberInitial(email: string) {
  return email.trim().slice(0, 1).toUpperCase() || '?'
}

function getMemberRoleLabel(role: Exclude<PlanRole, 'owner'>) {
  return role === 'editor' ? '수정가능' : '읽기전용'
}

function getPlanRoleLabel(role: PlanRole) {
  return role === 'owner' ? '소유자' : role === 'editor' ? '수정가능' : '읽기전용'
}

function getTreeScaleLabel(kind: PlantKind) {
  if (kind === 'shrub') return '관목'
  if (kind === 'evergreen' || kind === 'deciduous') return '교목'
  return null
}

function isTreeKind(kind: PlantKind) {
  return getTreeScaleLabel(kind) !== null
}

function groupTreeScaleItems<T extends Pick<PlantTemplate, 'kind'>>(items: T[]) {
  const canopyItems = items.filter((item) => getTreeScaleLabel(item.kind) === '교목')
  const shrubItems = items.filter((item) => getTreeScaleLabel(item.kind) === '관목')
  const otherItems = items.filter((item) => getTreeScaleLabel(item.kind) === null)

  return [
    { label: '교목', items: canopyItems },
    { label: '관목', items: shrubItems },
    { label: null, items: otherItems },
  ].filter((group) => group.items.length > 0)
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <main data-theme="light" className="landi-app flex min-h-screen items-center justify-center bg-[var(--landi-bg)] px-5 text-slate-900">
      <div className="grid justify-items-center gap-3 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm">
          <Trees size={24} />
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--landi-primary)]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--landi-primary)] [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--landi-primary)] [animation-delay:240ms]" />
        </div>
        <p className="text-[13px] font-semibold text-slate-500">{message}</p>
      </div>
    </main>
  )
}

function GuidePage({ authControls, onBack }: { authControls: ReactNode; onBack: () => void }) {
  const steps = [
    { title: '조감도 만들기', description: '목록에서 새 조감도를 만든 뒤 편집보드로 들어갑니다.' },
    { title: '도면 올리기', description: '상단 업로드 버튼으로 배경 도면을 먼저 올립니다.' },
    { title: '식재 채우기', description: '좌측 팔레트에서 나무, 풀, 꽃 식재를 등록합니다.' },
    { title: '도면에 배치', description: '등록한 식재를 클릭하거나 드래그해 도면 위에 놓습니다.' },
    { title: '보드 설정 다듬기', description: '선택한 식재의 크기를 조정하고 우측 보드 설정에서 라벨과 표시 유형을 정리합니다.' },
    { title: '수량집계 후 저장', description: '우측 수량집계에서 배치 결과를 확인하고 이미지로 내보냅니다.' },
  ]
  const panels = [
    { title: '좌측 식재 팔레트', description: '식재를 등록하고 도면에 올릴 준비를 하는 영역입니다.' },
    { title: '중앙 편집보드', description: '도면 위에서 식재 위치와 크기를 조정하는 작업 공간입니다.' },
    { title: '우측 도구 패널', description: '공유, 보드 설정, 수량집계를 확인하는 보조 영역입니다.' },
  ]
  const tips = [
    '식재 이름 라벨은 같은 식재가 여러 개 있어도 대표 1개만 표시합니다.',
    '보이는 식재 유형은 기본적으로 모두 켜져 있고, 새 식재를 추가하면 해당 유형이 자동으로 다시 표시됩니다.',
    '읽기전용 멤버는 조감도를 확인할 수 있지만 편집과 업로드는 할 수 없습니다.',
  ]

  return (
    <main data-theme="light" className="landi-app min-h-screen bg-[var(--landi-bg)] px-5 py-6 text-slate-900 md:px-8">
      <header className="mx-auto mb-10 flex max-w-6xl flex-wrap items-start justify-between gap-4 md:mb-12">
        <div className="grid min-w-0 gap-2">
          <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="돌아가기" title="돌아가기"><ArrowLeft size={17} /></button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm"><Trees size={24} /></div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal">Landi 시작 가이드</h1>
              <p className="text-sm text-slate-500">처음 쓰는 흐름을 빠르게 익히는 안내입니다.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {authControls}
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quick Start</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">도면을 올리고 식재를 배치한 뒤 이미지로 저장합니다.</h2>
            </div>
            <span className="rounded-md bg-[var(--landi-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--landi-primary)]">6단계</span>
          </div>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border border-slate-200 bg-[var(--landi-panel)] p-3">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--landi-primary)] text-xs font-semibold text-white">{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <aside className="grid gap-5">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Workspace</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">화면 구성</h2>
            <div className="mt-4 grid gap-2">
              {panels.map((panel) => (
                <div key={panel.title} className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
                  <h3 className="text-[13px] font-semibold text-slate-800">{panel.title}</h3>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500">{panel.description}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-md border border-[var(--landi-accent-copper-border)] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Checklist</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">작업 전에 알아두면 좋은 점</h2>
            <div className="mt-4 grid gap-2">
              {tips.map((tip) => (
                <p key={tip} className="rounded-md bg-[var(--landi-accent-copper-soft)] px-3 py-2 text-[12px] leading-5 text-[var(--landi-accent-copper-dark)]">{tip}</p>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

function ResizeHandle({ anchor, onResizeStart }: { anchor: ResizeAnchor; onResizeStart: (anchor: ResizeAnchor, event: ReactPointerEvent<HTMLButtonElement>) => void }) {
  const positionMap: Record<ResizeAnchor, string> = {
    n: 'left-1/2 -top-1 -translate-x-1/2 cursor-ns-resize',
    e: '-right-1 top-1/2 -translate-y-1/2 cursor-ew-resize',
    s: 'left-1/2 -bottom-1 -translate-x-1/2 cursor-ns-resize',
    w: '-left-1 top-1/2 -translate-y-1/2 cursor-ew-resize',
    ne: '-right-1 -top-1 cursor-nesw-resize',
    nw: '-left-1 -top-1 cursor-nwse-resize',
    se: '-bottom-1 -right-1 cursor-nwse-resize',
    sw: '-bottom-1 -left-1 cursor-nesw-resize',
  }

  return <button type="button" onPointerDown={(event) => onResizeStart(anchor, event)} className={`resize-handle export-hidden absolute h-2 w-2 touch-none rounded-[1.5px] border ${positionMap[anchor]}`} style={{ backgroundColor: '#2563eb', borderColor: '#ffffff' }} aria-label={`식재 ${anchor} 방향 크기 조절`} />
}

function PlantNameLabel({ plant, hoverOnly = false, exportHidden = false }: { plant: Plant; hoverOnly?: boolean; exportHidden?: boolean }) {
  const shouldPlaceAbove = plant.y + plant.size + 76 > BOARD_HEIGHT
  const verticalClass = shouldPlaceAbove ? 'bottom-[calc(100%-8px)]' : 'top-[calc(100%-10px)]'
  const visibilityClass = hoverOnly ? 'opacity-0 transition-opacity group-hover:opacity-100' : ''

  return (
    <div
      className={`${exportHidden ? 'export-hidden ' : ''}pointer-events-none absolute left-1/2 h-[18px] w-max max-w-[180px] -translate-x-1/2 overflow-hidden truncate whitespace-nowrap rounded-sm px-2 text-center text-[10px] font-semibold ${verticalClass} ${visibilityClass}`}
      title={plant.name}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)', border: '1px solid rgba(15, 23, 42, 0.10)', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.16)', color: '#334155', lineHeight: '18px', textOverflow: 'ellipsis' }}
    >
      <span className="landi-plant-label-text">{plant.name}</span>
    </div>
  )
}

function InventoryPlantIcon({ plant }: { plant: PlantTemplate }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--landi-panel)] ring-1 ring-slate-200">
      <PlantSymbol plant={{ ...plant, size: 24 }} />
    </div>
  )
}

function PlacedPlant({ plant, selected, plantIntensity, showLabel, boardScale, readOnly, onSelect, onMove, onResize }: { plant: Plant; selected: boolean; plantIntensity: number; showLabel: boolean; boardScale: number; readOnly: boolean; onSelect: () => void; onMove: (updates: Pick<Plant, 'x' | 'y'>) => void; onResize: (updates: Pick<Plant, 'x' | 'y' | 'size'>) => void }) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const handles: ResizeAnchor[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const normalizedIntensity = clampPercent(plantIntensity)
  const symbolOpacity = Math.max(0.25, normalizedIntensity / 100)
  const symbolFilter = `saturate(${80 + normalizedIntensity * 0.45}%) contrast(${90 + normalizedIntensity * 0.2}%)`

  const startResize = (anchor: ResizeAnchor, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (readOnly) return
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startSize = plant.size
    const startPlantX = plant.x
    const startPlantY = plant.y

    const move = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / boardScale
      const deltaY = (moveEvent.clientY - startY) / boardScale
      const horizontalDelta = anchor.includes('e') ? deltaX : anchor.includes('w') ? -deltaX : 0
      const verticalDelta = anchor.includes('s') ? deltaY : anchor.includes('n') ? -deltaY : 0
      const delta = anchor.length === 2 ? Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta : horizontalDelta || verticalDelta
      const nextSize = clampPlantSize(startSize + delta)
      const sizeDelta = nextSize - startSize
      onResize({
        size: nextSize,
        x: anchor.includes('w') ? startPlantX - sizeDelta : startPlantX,
        y: anchor.includes('n') ? startPlantY - sizeDelta : startPlantY,
      })
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <Draggable nodeRef={nodeRef} position={{ x: plant.x + PLANT_SYMBOL_OFFSET_X, y: plant.y + PLANT_SYMBOL_OFFSET_Y }} bounds="parent" cancel=".resize-handle" disabled={readOnly} scale={boardScale} onStop={(_: DraggableEvent, data: DraggableData) => onMove({ x: data.x - PLANT_SYMBOL_OFFSET_X, y: data.y - PLANT_SYMBOL_OFFSET_Y })}>
      <div ref={nodeRef} onClick={(event) => { event.stopPropagation(); onSelect() }} className={`group absolute touch-none select-none ${readOnly ? 'cursor-default' : 'cursor-move'}`} style={{ width: plant.size + 16, height: plant.size + 20, filter: 'drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))' }}>
        <div className="relative" style={{ opacity: selected ? Math.min(0.92, symbolOpacity) : symbolOpacity, filter: symbolFilter }}>
          <PlantSymbol plant={plant} />
        </div>
        {selected && !readOnly && <div className="export-hidden absolute left-2 top-2 rounded-md outline outline-1 outline-offset-0" style={{ width: plant.size, height: plant.size, outlineColor: '#2563eb' }}>{handles.map((anchor) => <ResizeHandle key={anchor} anchor={anchor} onResizeStart={startResize} />)}</div>}
        {showLabel && <PlantNameLabel plant={plant} />}
        {!showLabel && <PlantNameLabel plant={plant} hoverOnly exportHidden />}
      </div>
    </Draggable>
  )
}
function PlanThumbnail({ plan }: { plan: Plan }) {
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
function StaticPlanBoard({ plan, showEmptyState = true }: { plan: Plan; showEmptyState?: boolean }) {
  const backgroundFade = clampPercent(plan.backgroundFade ?? 62)
  const backgroundSaturation = clampPercent(plan.backgroundSaturation ?? 100)
  const plantIntensity = clampPercent(plan.plantIntensity ?? 100)
  const showPlantLabels = plan.showPlantLabels ?? false
  const representativeLabelIds = getRepresentativeLabelIds(plan.plants)
  const overlay = backgroundFade / 100
  const symbolOpacity = Math.max(0.25, plantIntensity / 100)
  const symbolFilter = `saturate(${80 + plantIntensity * 0.45}%) contrast(${90 + plantIntensity * 0.2}%)`

  return (
    <div className="relative h-[640px] w-[1120px] overflow-visible border border-[var(--landi-board-border)] bg-[var(--landi-board)]">
      {plan.backgroundUrl ? (
        <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,${overlay}), rgba(255,255,255,${overlay})), url(${plan.backgroundUrl})`, filter: `saturate(${backgroundSaturation}%)` }} />
      ) : (
        <div className="absolute inset-0 bg-[var(--landi-board)]" />
      )}
      {showEmptyState && !plan.backgroundUrl && plan.plants.length === 0 && (
        <div className="absolute left-1/2 top-1/2 z-10 w-[min(320px,calc(100%-56px))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white/92 px-5 py-5 text-center shadow-[0_10px_26px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-500">
            <ImagePlus size={20} />
          </div>
          <p className="mt-3 text-[14px] font-semibold text-slate-900">{EMPTY_PLAN_TITLE}</p>
        </div>
      )}
      {plan.plants.map((plant) => (
        <div key={plant.instanceId} className="absolute touch-none select-none" style={{ left: plant.x + PLANT_SYMBOL_OFFSET_X, top: plant.y + PLANT_SYMBOL_OFFSET_Y, width: plant.size + 16, height: plant.size + 20, filter: 'drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))' }}>
          <div style={{ opacity: symbolOpacity, filter: symbolFilter }}>
            <PlantSymbol plant={plant} />
          </div>
          {showPlantLabels && representativeLabelIds.has(plant.instanceId) && <PlantNameLabel plant={plant} />}
        </div>
      ))}
    </div>
  )
}
function App() {
  const [plans, setPlans] = useState<Plan[]>(loadPlans)
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? '')
  const [mode, setMode] = useState<ViewMode>('list')
  const [guideReturnMode, setGuideReturnMode] = useState<ViewMode>('list')
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)
  const [isClearPlantsConfirmOpen, setIsClearPlantsConfirmOpen] = useState(false)
  const [newPlantKind, setNewPlantKind] = useState<PlantKind>('deciduous')
  const [newPlantName, setNewPlantName] = useState('')
  const [newPlantLabel, setNewPlantLabel] = useState('')
  const [newFlowerColor, setNewFlowerColor] = useState(flowerColorOptions[0].value)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [isPaletteFormOpen, setIsPaletteFormOpen] = useState(false)
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1280)
  const [activeToolPanel, setActiveToolPanel] = useState<InspectorPanel | null>(null)
  const [paletteFormError, setPaletteFormError] = useState('')
  const [exportError, setExportError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [authUser, setAuthUser] = useState<LandiUser | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [isSharedPlansLoading, setIsSharedPlansLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<PlanRole, 'owner'>>('viewer')
  const [inviteError, setInviteError] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [visiblePlantCategories, setVisiblePlantCategories] = useState<Record<PlantCategory, boolean>>(defaultVisiblePlantCategories)
  const [boardScale, setBoardScale] = useState(1)
  const [viewport, setViewport] = useState(() => ({ width: typeof window === 'undefined' ? 1440 : window.innerWidth, height: typeof window === 'undefined' ? 900 : window.innerHeight }))
  const [allowPortraitEditing, setAllowPortraitEditing] = useState(false)
  const boardFrameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLDivElement>(null)
  const applyingRemotePlansRef = useRef(false)
  const saveSequenceRef = useRef(0)
  const remoteSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0]
  const selectedPlant = selectedPlan?.plants.find((plant) => plant.instanceId === selectedPlantId)
  const representativeLabelIds = useMemo(() => getRepresentativeLabelIds(selectedPlan?.plants ?? []), [selectedPlan?.plants])
  const selectedPlanRole = selectedPlan ? getPlanRole(selectedPlan, authUser) : 'viewer'
  const canEditSelectedPlan = selectedPlanRole === 'owner' || selectedPlanRole === 'editor'
  const canManageSelectedPlan = selectedPlanRole === 'owner' && Boolean(authUser)
  const hasPlanBackground = Boolean(selectedPlan?.backgroundUrl)
  const canPlacePlants = canEditSelectedPlan && hasPlanBackground
  const canUseBoardControls = canEditSelectedPlan && hasPlanBackground
  const isPaletteFormVisible = canEditSelectedPlan && isPaletteFormOpen
  const canOpenSelectedPlanEditor = selectedPlanRole === 'owner' || selectedPlanRole === 'editor'

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setAuthUser(getSessionUser(data.session))
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthUser(getSessionUser(session))
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const supabaseClient = supabase
    if (!supabaseClient || !authUser?.email) return
    let active = true

    const loadSharedPlans = async (showLoading = false) => {
      if (showLoading) setIsSharedPlansLoading(true)
      const { data, error } = await supabaseClient
        .from('plans')
        .select('*')
        .contains('access_emails', [authUser.email.toLowerCase()])
        .order('updated_at', { ascending: false })

      if (!active) return
      if (error) {
        setAuthError(`공유 조감도를 불러오지 못했습니다. ${error.message}`)
        if (showLoading) setIsSharedPlansLoading(false)
        return
      }
      if (data) {
        applyingRemotePlansRef.current = true
        const sharedRows = data as SharedPlanRow[]
        const joinedPlanIds: string[] = []
        const joinedAt = new Date().toISOString()
        const sharedPlans = sharedRows.map((row) => {
          const plan = migratePlan(sharedRowToPlan(row))
          if (plan.ownerId === authUser.id || plan.ownerEmail?.toLowerCase() === authUser.email.toLowerCase()) return plan
          const member = plan.members?.find((item) => item.email.toLowerCase() === authUser.email.toLowerCase())
          if (!member || member.status === 'joined') return plan
          joinedPlanIds.push(plan.id)
          return {
            ...plan,
            members: (plan.members ?? []).map((item) => item.email.toLowerCase() === authUser.email.toLowerCase() ? { ...item, status: 'joined' as const, joinedAt: item.joinedAt ?? joinedAt } : item),
          }
        })
        setPlans(sharedPlans)
        setSelectedPlanId((current) => sharedPlans.some((plan) => plan.id === current) ? current : sharedPlans[0]?.id ?? '')
        if (joinedPlanIds.length > 0) {
          const { data: sessionData } = await supabaseClient.auth.getSession()
          const accessToken = sessionData.session?.access_token
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
          if (accessToken && supabaseUrl && supabaseKey) {
            void fetch(`${supabaseUrl}/functions/v1/mark-member-joined`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: supabaseKey,
                'x-landi-auth': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ planIds: joinedPlanIds }),
            })
          }
        }
      }
      if (showLoading) setIsSharedPlansLoading(false)
    }

    void loadSharedPlans(true)
    const channel = supabaseClient.channel('landi-plans-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => void loadSharedPlans()).subscribe()
    return () => {
      active = false
      void supabaseClient.removeChannel(channel)
    }
  }, [authUser])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
  }, [plans])

  useEffect(() => {
    if (applyingRemotePlansRef.current) {
      applyingRemotePlansRef.current = false
      return
    }
    if (!supabase || !authUser) {
      return
    }

    const supabaseClient = supabase
    const ownerPlans = plans.filter((plan) => getPlanRole(plan, authUser) === 'owner')
    const editorPlans = plans.filter((plan) => getPlanRole(plan, authUser) === 'editor')
    if (ownerPlans.length === 0 && editorPlans.length === 0) {
      return
    }

    if (remoteSaveDebounceRef.current) window.clearTimeout(remoteSaveDebounceRef.current)
    remoteSaveDebounceRef.current = window.setTimeout(() => {
      void (async () => {
        const saveSequence = saveSequenceRef.current + 1
        saveSequenceRef.current = saveSequence
        if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
        saveStatusTimerRef.current = window.setTimeout(() => {
          if (saveSequenceRef.current === saveSequence) setSaveStatus('saving')
        }, 700)
        const ownerRows = ownerPlans.map((plan) => planToSharedRow(plan, authUser))
        if (ownerRows.length > 0) {
          const { error } = await supabaseClient
            .from('plans')
            .upsert(ownerRows, { onConflict: 'id' })
          if (error) {
            if (saveSequenceRef.current === saveSequence) {
              if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
              saveStatusTimerRef.current = null
              setSaveStatus('error')
              setAuthError(`공유 조감도를 저장하지 못했습니다. ${error.message}`)
            }
            return
          }
        }

        for (const plan of editorPlans) {
          const row = planToSharedRow(plan, authUser)
          const { error } = await supabaseClient
            .from('plans')
            .update({
              title: row.title,
              data: row.data,
              access_emails: row.access_emails,
              members: row.members,
              updated_at: row.updated_at,
            })
            .eq('id', row.id)
          if (error) {
            if (saveSequenceRef.current === saveSequence) {
              if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
              saveStatusTimerRef.current = null
              setSaveStatus('error')
              setAuthError(`공유 조감도를 저장하지 못했습니다. ${error.message}`)
            }
            return
          }
        }
        if (saveSequenceRef.current === saveSequence) {
          if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
          saveStatusTimerRef.current = null
          setSaveStatus('saved')
          setAuthError((current) => current.startsWith('공유 조감도를 저장하지 못했습니다.') ? '' : current)
        }
      })()
    }, 900)
    return () => {
      if (remoteSaveDebounceRef.current) {
        window.clearTimeout(remoteSaveDebounceRef.current)
        remoteSaveDebounceRef.current = null
      }
    }
  }, [plans, authUser])
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
  }, [mode])

  useEffect(() => () => {
    if (remoteSaveDebounceRef.current) window.clearTimeout(remoteSaveDebounceRef.current)
    if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
  }, [])

  const updateSelectedPlan = (updates: Partial<Plan>) => {
    if (!selectedPlan || !canEditSelectedPlan) return
    setPlans((current) => current.map((plan) => {
      if (plan.id !== selectedPlan.id) return plan
      const nextPlan = { ...plan, ...updates, updatedAt: new Date().toISOString(), ...getEditorMetadata(authUser) }
      return authUser ? normalizePlanForUser(nextPlan, authUser) : nextPlan
    }))
  }
  const updatePlants = (updater: (plants: Plant[]) => Plant[]) => selectedPlan && updateSelectedPlan({ plants: updater(selectedPlan.plants) })

  const inventory = useMemo(() => selectedPlan?.palette.map((template) => ({ ...template, count: selectedPlan.plants.filter((plant) => plant.templateId === template.id).length })) ?? [], [selectedPlan])
  const groupedInventory = useMemo(() => kindOptions.map((group) => {
    const items = inventory.filter((item) => item.category === group.category && item.count > 0)
    const total = items.reduce((sum, item) => sum + item.count, 0)
    return { ...group, items, total }
  }).filter((group) => group.items.length > 0), [inventory])

  const signInWithGoogle = async () => {
    setAuthError('')
    if (!supabase) {
      setAuthError('Supabase 환경 변수가 설정되지 않았습니다. .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 추가해주세요.')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) setAuthError(`구글 로그인에 실패했습니다. ${error.message}`)
  }

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setAuthError(`로그아웃에 실패했습니다. ${error.message}`)
    setAuthUser(null)
  }

  const inviteMember = async () => {
    if (!selectedPlan || !authUser || !canManageSelectedPlan) return
    const email = inviteEmail.trim().toLowerCase()
    setInviteStatus('')
    if (!email || !emailPattern.test(email)) {
      setInviteError('초대할 이메일을 입력해주세요.')
      return
    }
    if (email === authUser.email.toLowerCase()) {
      setInviteError('소유자 본인은 초대할 수 없습니다.')
      return
    }

    const currentMembers = selectedPlan.members ?? []
    const existingMember = currentMembers.find((member) => member.email.toLowerCase() === email)
    const nextMembers = [
      ...currentMembers.filter((member) => member.email.toLowerCase() !== email),
      { id: existingMember?.id ?? `member-${crypto.randomUUID()}`, email, role: inviteRole, invitedAt: existingMember?.invitedAt ?? new Date().toISOString(), invitedBy: existingMember?.invitedBy ?? authUser.email, status: existingMember?.status ?? 'invited' as const, joinedAt: existingMember?.joinedAt },
    ]
    const accessEmails = Array.from(new Set([...(selectedPlan.accessEmails ?? []), selectedPlan.ownerEmail ?? authUser.email, email].map((item) => item.toLowerCase()).filter(Boolean)))
    const nextPlan = normalizePlanForUser({ ...selectedPlan, members: nextMembers, accessEmails, updatedAt: new Date().toISOString(), ...getEditorMetadata(authUser) }, authUser)
    setInviteError('')
    setInviteEmail('')
    updateSelectedPlan({ members: nextMembers, accessEmails })

    if (!supabase) {
      setInviteStatus(existingMember ? '멤버 권한을 업데이트했습니다. Supabase 설정 후에는 메일도 발송됩니다.' : '권한을 추가했습니다. Supabase 설정 후에는 초대 메일도 발송됩니다.')
      return
    }

    setIsInviting(true)
    const { error: saveError } = await supabase
      .from('plans')
      .upsert(planToSharedRow(nextPlan, authUser), { onConflict: 'id' })

    if (saveError) {
      setIsInviting(false)
      setInviteError(`초대 권한 저장에 실패했습니다. ${saveError.message}`)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

    if (!accessToken || !supabaseUrl || !supabaseKey) {
      setIsInviting(false)
      setInviteError('로그인 세션을 확인하지 못해 초대 메일을 발송하지 못했습니다.')
      return
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/invite-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        'x-landi-auth': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ planId: nextPlan.id, email, role: inviteRole, redirectTo: window.location.origin }),
    })
    const data = await response.json().catch(() => null)
    setIsInviting(false)

    if (!response.ok) {
      const message = data?.error ?? data?.message ?? response.statusText
      setInviteError(`권한은 추가됐지만 초대 메일 발송에 실패했습니다. ${message}`)
      return
    }
    if (data?.emailSent === false) {
      const detail = data?.detail ? ` 사유: ${data.detail}` : ''
      setInviteStatus(`권한은 추가했습니다. 메일 발송은 실패했지만 대상자는 로그인 후 접근할 수 있습니다.${detail}`)
      return
    }
    setInviteStatus(data?.emailKind === 'signin' ? '권한을 추가하고 로그인 안내 메일을 발송했습니다.' : existingMember ? '멤버 권한을 업데이트하고 안내 메일을 발송했습니다.' : '초대 메일을 발송했습니다.')
  }

  const persistMemberAccess = async (nextPlan: Plan, successMessage: string) => {
    if (!supabase || !authUser) {
      setInviteStatus(successMessage)
      return
    }

    const { error } = await supabase
      .from('plans')
      .upsert(planToSharedRow(nextPlan, authUser), { onConflict: 'id' })

    if (error) {
      setInviteError(`권한 변경 저장에 실패했습니다. ${error.message}`)
      return
    }
    setInviteError('')
    setInviteStatus(successMessage)
  }

  const updateMemberRole = async (email: string, role: Exclude<PlanRole, 'owner'>) => {
    if (!selectedPlan || !canManageSelectedPlan || !authUser) return
    const normalizedEmail = email.toLowerCase()
    const nextMembers = (selectedPlan.members ?? []).map((member) => member.email.toLowerCase() === normalizedEmail ? { ...member, role } : member)
    const nextPlan = normalizePlanForUser({ ...selectedPlan, members: nextMembers, updatedAt: new Date().toISOString(), ...getEditorMetadata(authUser) }, authUser)
    updateSelectedPlan({ members: nextMembers })
    await persistMemberAccess(nextPlan, '멤버 권한을 업데이트했습니다.')
  }

  const removeMember = async (email: string) => {
    if (!selectedPlan || !canManageSelectedPlan || !authUser) return
    const normalizedEmail = email.toLowerCase()
    const nextMembers = (selectedPlan.members ?? []).filter((member) => member.email.toLowerCase() !== normalizedEmail)
    const nextAccessEmails = (selectedPlan.accessEmails ?? []).filter((item) => item.toLowerCase() !== normalizedEmail)
    const nextPlan = normalizePlanForUser({ ...selectedPlan, members: nextMembers, accessEmails: nextAccessEmails, updatedAt: new Date().toISOString(), ...getEditorMetadata(authUser) }, authUser)
    updateSelectedPlan({ members: nextMembers, accessEmails: nextAccessEmails })
    await persistMemberAccess(nextPlan, '멤버 접근 권한을 삭제했습니다.')
  }

  const createNewPlan = () => {
    const next = createPlan(`새 조감도 ${plans.length + 1}`, authUser)
    setPlans((current) => [next, ...current])
    setSelectedPlanId(next.id)
    setSelectedPlantId(null)
    setMode('edit')
  }
  const deletePlan = (planId: string) => {
    const targetPlan = plans.find((plan) => plan.id === planId)
    if (!targetPlan || getPlanRole(targetPlan, authUser) !== 'owner') return
    const nextPlans = plans.filter((plan) => plan.id !== planId)
    setPlans(nextPlans)
    if (supabase && authUser) {
      void supabase.from('plans').delete().eq('id', planId).then(({ error }) => {
        if (error) setAuthError(`조감도를 삭제하지 못했습니다. ${error.message}`)
      })
    }
    if (selectedPlanId === planId) { setSelectedPlanId(nextPlans[0]?.id ?? ''); setSelectedPlantId(null); setMode('list') }
  }
  const openPreview = (planId: string) => { setSelectedPlanId(planId); setSelectedPlantId(null); setMode('preview') }
  const openEditor = (planId: string) => { setSelectedPlanId(planId); setSelectedPlantId(null); setMode('edit') }
  const openGuide = () => {
    setGuideReturnMode(mode === 'guide' ? 'list' : mode)
    setMode('guide')
  }
  const closeGuide = () => setMode(guideReturnMode === 'guide' ? 'list' : guideReturnMode)
  const resetPaletteForm = () => {
    setEditingTemplateId(null)
    setNewPlantKind('deciduous')
    setNewPlantName('')
    setNewPlantLabel('')
    setNewFlowerColor(flowerColorOptions[0].value)
  }

  const startEditTemplate = (template: PlantTemplate) => {
    if (!canEditSelectedPlan) return
    setEditingTemplateId(template.id)
    setNewPlantKind(template.kind)
    setNewPlantName(template.name)
    setNewPlantLabel(template.label)
    setNewFlowerColor(template.colors.accent)
    setPaletteFormError('')
    setIsPaletteFormOpen(true)
  }

  const validatePaletteForm = () => {
    if (!selectedPlan || !canEditSelectedPlan) return '조감도를 먼저 선택해주세요.'
    const name = newPlantName.trim()
    if (!name) return '식재명을 입력해주세요.'
    const duplicateName = selectedPlan.palette.some((template) => template.id !== editingTemplateId && template.name.trim().toLocaleLowerCase('ko-KR') === name.toLocaleLowerCase('ko-KR'))
    if (duplicateName) return '이미 등록된 식재명입니다.'
    if (newPlantLabel.trim().length > 80) return '학명/메모는 80자 이하로 입력해주세요.'
    return ''
  }

  const addTemplateToPalette = () => {
    const error = validatePaletteForm()
    if (error) {
      setPaletteFormError(error)
      return
    }
    if (!selectedPlan || !canEditSelectedPlan) return
    setPaletteFormError('')
    const nextTemplate = createTemplate(newPlantKind, newPlantName.trim(), newPlantLabel.trim(), newFlowerColor)

    if (editingTemplateId) {
      const updatedTemplate = { ...nextTemplate, id: editingTemplateId }
      updateSelectedPlan({
        palette: selectedPlan.palette.map((template) => (template.id === editingTemplateId ? updatedTemplate : template)),
        plants: selectedPlan.plants.map((plant) =>
          plant.templateId === editingTemplateId
            ? { ...updatedTemplate, instanceId: plant.instanceId, templateId: plant.templateId, x: plant.x, y: plant.y, size: plant.size }
            : plant,
        ),
      })
      resetPaletteForm()
      return
    }

    updateSelectedPlan({ palette: [...selectedPlan.palette, nextTemplate] })
    resetPaletteForm()
  }

  const handlePaletteFormKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    addTemplateToPalette()
  }

  const deleteTemplateFromPalette = (templateId: string) => {
    if (!selectedPlan || !canEditSelectedPlan) return
    updateSelectedPlan({
      palette: selectedPlan.palette.filter((template) => template.id !== templateId),
      plants: selectedPlan.plants.filter((plant) => plant.templateId !== templateId),
    })
    if (editingTemplateId === templateId) resetPaletteForm()
    if (selectedPlant?.templateId === templateId) setSelectedPlantId(null)
  }
  const addPlant = (template: PlantTemplate, x = 520, y = 330) => {
    if (!canPlacePlants) return
    const instanceId = `${template.id}-${crypto.randomUUID()}`
    const size = clampPlantSize(template.size)
    setVisiblePlantCategories((current) => ({ ...current, [template.category as PlantCategory]: true }))
    updatePlants((current) => [...current, { ...template, instanceId, templateId: template.id, size, x: x - size / 2, y: y - size / 2 }])
    setSelectedPlantId(instanceId)
  }
  const updatePlant = (instanceId: string, updates: Partial<Plant>) => canEditSelectedPlan && updatePlants((current) => current.map((plant) => plant.instanceId === instanceId ? { ...plant, ...updates, ...(updates.size === undefined ? {} : { size: clampPlantSize(updates.size) }) } : plant))
  const deleteSelectedPlant = () => { if (selectedPlantId && canEditSelectedPlan) { updatePlants((current) => current.filter((plant) => plant.instanceId !== selectedPlantId)); setSelectedPlantId(null) } }
  const clearPlacedPlants = () => {
    if (!canEditSelectedPlan || selectedPlan.plants.length === 0) return
    updateSelectedPlan({ plants: [] })
    setSelectedPlantId(null)
    setIsClearPlantsConfirmOpen(false)
  }
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !canEditSelectedPlan) return
    const reader = new FileReader()
    reader.onload = () => updateSelectedPlan({ backgroundUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!selectedPlan || !canPlacePlants) return
    const template = selectedPlan.palette.find((item) => item.id === event.dataTransfer.getData('template-id'))
    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    if (template && canvasBounds) addPlant(template, (event.clientX - canvasBounds.left) / boardScale, (event.clientY - canvasBounds.top) / boardScale)
  }
  const exportPlanImage = async () => {
    const exportNode = mode === 'preview' ? previewCanvasRef.current : canvasRef.current
    if (!exportNode || !selectedPlan || isExporting) return
    setExportError('')
    setIsExporting(true)

    type ExportFormat = 'png' | 'jpg'
    type SaveFilePicker = (options: {
      suggestedName?: string
      types?: Array<{ description: string; accept: Record<string, string[]> }>
      excludeAcceptAllOption?: boolean
    }) => Promise<FileSystemFileHandle>

    const baseFileName = `${selectedPlan.title || 'landi-plan'}-${new Date().toISOString().slice(0, 10)}`
    const savePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
    let exportFormat: ExportFormat = 'png'
    let saveHandle: FileSystemFileHandle | null = null
    const boardBackgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--landi-board').trim() || '#f7f7f2'
    const boardBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--landi-board-border').trim() || '#d8ded4'

    try {
      if (savePicker) {
        saveHandle = await savePicker({
          suggestedName: `${baseFileName}.png`,
          types: [
            { description: 'PNG 이미지', accept: { 'image/png': ['.png'] } },
            { description: 'JPG 이미지', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } },
          ],
          excludeAcceptAllOption: true,
        })

        const selectedFormat = getExportFormatFromFileName(saveHandle.name)
        if (!selectedFormat) throw new Error('이미지는 PNG 또는 JPG 형식으로만 저장할 수 있습니다.')
        exportFormat = selectedFormat
      }

      exportNode.classList.add('landi-exporting')
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const canvas = await html2canvas(exportNode, {
        backgroundColor: exportFormat === 'jpg' ? '#ffffff' : boardBackgroundColor,
        ignoreElements: (element) => element.classList.contains('export-hidden'),
        onclone: (documentClone) => {
          const cloneWindow = documentClone.defaultView
          const clonedBoard = documentClone.querySelector('[data-export-board="true"]')
          if (!cloneWindow || !clonedBoard) return

          ;[clonedBoard, ...Array.from(clonedBoard.querySelectorAll('*'))].forEach((node) => {
            if (!(node instanceof cloneWindow.HTMLElement) && !(node instanceof cloneWindow.SVGElement)) return
            const computed = cloneWindow.getComputedStyle(node)
            const style = (node as HTMLElement | SVGElement).style
            const safeColor = (value: string, fallback: string) => /oklch|oklab|lch|lab|color\(|color-mix|var\(/i.test(value) ? fallback : value

            style.setProperty('color', safeColor(computed.color, '#172019'), 'important')
            style.setProperty('background-color', safeColor(computed.backgroundColor, 'rgba(0, 0, 0, 0)'), 'important')
            style.setProperty('border-top-color', safeColor(computed.borderTopColor, boardBorderColor), 'important')
            style.setProperty('border-right-color', safeColor(computed.borderRightColor, boardBorderColor), 'important')
            style.setProperty('border-bottom-color', safeColor(computed.borderBottomColor, boardBorderColor), 'important')
            style.setProperty('border-left-color', safeColor(computed.borderLeftColor, boardBorderColor), 'important')
            style.setProperty('outline-color', safeColor(computed.outlineColor, '#2563eb'), 'important')
            style.setProperty('text-decoration-color', safeColor(computed.textDecorationColor, '#172019'), 'important')
            style.setProperty('fill', safeColor(computed.fill, computed.color), 'important')
            style.setProperty('stroke', safeColor(computed.stroke, computed.color), 'important')
            if (/oklch|oklab|lch|lab|color\(|color-mix|var\(/i.test(computed.boxShadow)) style.setProperty('box-shadow', 'none', 'important')
          })
        },
        scale: 2,
        useCORS: true,
      })
      const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png'
      const blob = await canvasToImageBlob(canvas, mimeType, 0.92)

      if (saveHandle) {
        if (blob.type && blob.type !== mimeType) throw new Error('저장하려는 파일 형식과 이미지 데이터 형식이 일치하지 않습니다.')
        const writable = await saveHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const link = document.createElement('a')
        const objectUrl = URL.createObjectURL(blob)
        link.download = `${baseFileName}.${exportFormat}`
        link.href = objectUrl
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error(error)
      setExportError('이미지 내보내기에 실패했습니다. 저장 권한이나 브라우저 파일 저장 설정을 확인해주세요.')
    } finally {
      exportNode.classList.remove('landi-exporting')
      setIsExporting(false)
    }
  }

  const backgroundFade = clampPercent(selectedPlan?.backgroundFade ?? 62)
  const backgroundOverlay = backgroundFade / 100
  const backgroundSaturation = clampPercent(selectedPlan?.backgroundSaturation ?? 100)
  const plantIntensity = clampPercent(selectedPlan?.plantIntensity ?? 100)
  const showPlantLabels = selectedPlan?.showPlantLabels ?? false
  const visiblePlants = useMemo(() => selectedPlan?.plants.filter((plant) => visiblePlantCategories[plant.category as PlantCategory] ?? true) ?? [], [selectedPlan?.plants, visiblePlantCategories])
  const isMobileViewport = viewport.width < 768
  const isTabletPortrait = viewport.width >= 768 && viewport.width < 1280 && viewport.height > viewport.width
  const shouldShowOrientationLock = mode === 'edit' && selectedPlan && (isMobileViewport || (isTabletPortrait && !allowPortraitEditing))
  const actionButtonClass = "landi-action-button inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 font-semibold shadow-sm transition"
  const leftPanelClass = `landi-editor-panel ${isPaletteCollapsed ? 'is-collapsed' : ''} relative flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-slate-200 bg-[var(--landi-panel)] transition-[width] duration-200 lg:h-screen lg:max-h-none lg:border-b-0 lg:border-r ${isPaletteCollapsed ? 'lg:w-14 xl:w-14' : 'lg:w-[260px] xl:w-[286px]'}`
  const roleLabel = selectedPlanRole === 'owner' ? '소유자' : selectedPlanRole === 'editor' ? '수정가능' : '읽기전용'
  const ownerLabel = selectedPlan?.ownerEmail ?? authUser?.email ?? '로컬 조감도'
  const selectedPlanUpdatedLabel = selectedPlan ? getPlanUpdatedLabel(selectedPlan) : ''
  const saveStatusLabel = getSaveStatusLabel(saveStatus)
  const saveStatusClass = getSaveStatusClass(saveStatus)
  const toolPanelLabel = activeToolPanel === 'share' ? '공유' : activeToolPanel === 'board' ? '보드 설정' : activeToolPanel === 'schedule' ? '수량 집계' : ''
  const toolRailButtonClass = (panel: InspectorPanel) => `grid h-10 w-10 place-items-center rounded-md border text-sm transition ${activeToolPanel === panel ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)] shadow-sm' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700'}`
  const toggleToolPanel = (panel: InspectorPanel) => setActiveToolPanel((current) => current === panel ? null : panel)
  const toggleRightPanel = () => setActiveToolPanel((current) => current ? null : 'share')
  const togglePlantCategoryVisibility = (category: PlantCategory) => {
    if (!canUseBoardControls) return
    if (visiblePlantCategories[category] && selectedPlant?.category === category) setSelectedPlantId(null)
    setVisiblePlantCategories((current) => ({ ...current, [category]: !current[category] }))
  }
  const selectedPlantToolbarStyle = selectedPlant ? { left: Math.min(BOARD_WIDTH - 164, Math.max(8, selectedPlant.x + selectedPlant.size / 2 - 52)), top: Math.max(8, selectedPlant.y - 44) } : undefined
  const authControls = authUser ? <div className="flex h-10 items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="hidden min-w-0 max-w-[190px] items-center gap-2 px-3 text-sm font-semibold text-slate-700 md:flex" title={authUser.email}><UserRound size={16} className="shrink-0 text-[var(--landi-primary)]" /><span className="truncate">{authUser.name}</span></div><button type="button" onClick={signOut} title="로그아웃" className="grid h-10 w-10 place-items-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="로그아웃"><LogOut size={17} /></button></div> : <button type="button" onClick={signInWithGoogle} className={`${actionButtonClass} border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50`}><LogIn size={17} />Google 로그인</button>
  const guideButton = <button type="button" onClick={openGuide} className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}><HelpCircle size={17} />시작 가이드</button>
  const compactGuideButton = <button type="button" onClick={openGuide} title="시작 가이드" aria-label="시작 가이드" className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"><HelpCircle size={17} /></button>
  const editablePlanCount = plans.filter((plan) => {
    const role = getPlanRole(plan, authUser)
    return role === 'owner' || role === 'editor'
  }).length
  const sharedPlanCount = plans.filter((plan) => getPlanRole(plan, authUser) !== 'owner').length
  const planWithBoardCount = plans.filter((plan) => Boolean(plan.backgroundUrl)).length

  if (isSupabaseConfigured && !authReady) return <LoadingScreen message="로그인 상태를 확인하고 있습니다." />
  if (mode === 'guide') return <GuidePage authControls={authControls} onBack={closeGuide} />

  if (isSupabaseConfigured && !authUser) {
    return <main data-theme="light" className="landi-app flex min-h-screen items-center justify-center bg-[var(--landi-bg)] px-5 py-8 text-slate-900"><section className="w-full max-w-[420px] rounded-md border border-slate-200 bg-white/90 p-5 text-center shadow-[0_24px_70px_rgba(47,55,43,0.14)]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm"><Trees size={26} /></div><h1 className="mt-4 text-2xl font-semibold tracking-normal text-slate-950">Landi</h1><p className="mt-2 text-[13px] leading-5 text-slate-500">내 조감도와 공유받은 조감도를 확인하려면 로그인이 필요합니다.</p><button type="button" onClick={signInWithGoogle} className={`${actionButtonClass} mt-5 w-full bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}><LogIn size={17} />Google 로그인</button><button type="button" onClick={openGuide} className="landi-action-button mt-2 inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"><HelpCircle size={17} />시작 가이드</button>{authError && <div className="mt-3 rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-left text-xs font-semibold text-[var(--landi-danger-dark)]" role="alert">{authError}</div>}</section></main>
  }

  if (isSupabaseConfigured && authUser && isSharedPlansLoading && mode === 'list') return <LoadingScreen message="조감도 목록을 불러오고 있습니다." />

  if (mode === 'list') {
return <main data-theme="light" className="landi-app min-h-screen bg-[var(--landi-bg)] px-5 py-6 text-slate-900 md:px-8"><header className="mx-auto mb-10 grid max-w-6xl gap-6 md:mb-12"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm"><Trees size={24} /></div><div><h1 className="text-2xl font-semibold tracking-normal">Landi</h1><p className="text-sm text-slate-500">조감도 목록</p></div></div><div className="flex flex-wrap items-center gap-2">{authControls}{guideButton}{plans.length > 0 && <button type="button" onClick={createNewPlan} className={`${actionButtonClass} bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}><Plus size={17} />새 조감도 생성</button>}</div></div>{plans.length > 0 && <div className="grid gap-3 md:grid-cols-3"><div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">조감도</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-[24px] font-semibold leading-none text-slate-950">{plans.length}</p><span className="rounded-md bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">전체</span></div></div><div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">편집 권한</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-[24px] font-semibold leading-none text-slate-950">{editablePlanCount}</p><span className="rounded-md bg-[var(--landi-primary-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--landi-primary)]">수정 가능</span></div></div><div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">공유 / 도면 업로드</p><div className="mt-2 grid gap-2 text-[12px] text-slate-600"><div className="flex items-center justify-between gap-3"><span>공유된 조감도</span><span className="text-[20px] font-semibold leading-none text-slate-950">{sharedPlanCount}</span></div><div className="flex items-center justify-between gap-3"><span>도면 업로드 완료</span><span className="text-[20px] font-semibold leading-none text-slate-950">{planWithBoardCount}</span></div></div></div></div>}</header>{authError && <div className="mx-auto mb-4 max-w-6xl rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-danger-dark)]" role="alert">{authError}</div>}{!isSupabaseConfigured && <div className="mx-auto mb-4 max-w-6xl rounded-md border border-[var(--landi-warning-border)] bg-[var(--landi-warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-warning-dark)]">Supabase 환경 변수를 설정하면 Google 로그인과 멤버 초대가 활성화됩니다.</div>}<section className={`mx-auto grid max-w-6xl gap-5 ${plans.length === 0 ? "min-h-[52vh] content-center pt-8 md:pt-12" : "md:grid-cols-2 xl:grid-cols-3"}`}>{plans.length === 0 ? <div className="rounded-md border border-dashed border-[var(--landi-accent-copper-border)] bg-white/85 px-5 py-14 text-center shadow-sm md:col-span-2 xl:col-span-3"><div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[var(--landi-accent-copper-soft)] text-[var(--landi-accent-copper-dark)]"><Layers size={24} /></div><h2 className="mt-4 text-lg font-semibold text-slate-900">등록된 조감도가 없습니다</h2><p className="mt-2 text-sm leading-6 text-slate-500">새 조감도를 생성한 뒤 도면을 업로드하고 식재 팔레트를 구성해보세요.</p><button type="button" onClick={createNewPlan} className={`${actionButtonClass} mx-auto mt-5 bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}><Plus size={17} />새 조감도 생성</button></div> : plans.map((plan) => { const cardRole = getPlanRole(plan, authUser); const canOpenEditor = cardRole === 'owner' || cardRole === 'editor'; const roleBadgeClass = cardRole === 'owner' ? 'border-[var(--landi-accent-copper-border)] bg-[var(--landi-accent-copper-soft)] text-[var(--landi-accent-copper-dark)]' : cardRole === 'editor' ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)]' : 'border-sky-200 bg-sky-50 text-sky-700'; const roleAccentClass = cardRole === 'owner' ? 'bg-[var(--landi-accent-copper)]' : cardRole === 'editor' ? 'bg-[var(--landi-primary)]' : 'bg-sky-500'; return <article key={plan.id} className="landi-plan-card overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.12)]"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${roleAccentClass}`} aria-hidden="true" /><h2 className="min-w-0 break-words text-[17px] font-semibold leading-6 text-slate-900">{plan.title}</h2></div><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass}`}>{getPlanRoleLabel(cardRole)}</span><p className="min-w-0 text-[12px] leading-5 text-slate-500">{getPlanUpdatedLabel(plan)}</p></div></div>{cardRole === 'owner' && <button type="button" onClick={() => deletePlan(plan.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[var(--landi-danger)] transition hover:bg-[var(--landi-danger-soft)]" aria-label="조감도 삭제"><Trash2 size={18} /></button>}</div></div><div className="px-4 pt-4"><PlanThumbnail plan={plan} /></div><div className="grid gap-4 px-4 pb-4 pt-4"><div className="flex items-center justify-between gap-3 text-[12px] text-slate-500"><div className="flex items-center gap-2"><Layers size={14} className="text-slate-400" /><span>식재 {plan.plants.length}개</span></div><div className="flex items-center gap-2"><ImagePlus size={14} className="text-slate-400" /><span>{plan.backgroundUrl ? '도면 업로드 완료' : '도면 없음'}</span></div></div><div className={`grid gap-2 ${canOpenEditor ? 'grid-cols-2' : 'grid-cols-1'}`}><button type="button" onClick={() => openPreview(plan.id)} className={`${actionButtonClass} w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}><Eye size={17} />미리보기</button>{canOpenEditor && <button type="button" onClick={() => openEditor(plan.id)} className={`${actionButtonClass} w-full bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}><Pencil size={17} />편집보드</button>}</div></div></article> })}</section></main>
  }

  if (mode === 'preview' && selectedPlan) {
return <main data-theme="light" className="landi-app min-h-screen bg-[var(--landi-bg)] p-5 text-slate-900 md:p-8"><header className="mx-auto mb-5 grid max-w-6xl gap-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="grid min-w-0 gap-2"><button type="button" onClick={() => setMode('list')} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="목록으로" title="목록으로"><ArrowLeft size={17} /></button><div className="grid gap-1.5"><div className="flex min-w-0 flex-wrap items-start gap-2"><h1 className="min-w-0 flex-1 break-words text-[22px] font-semibold leading-7 tracking-normal text-slate-900">{selectedPlan.title}</h1><span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${selectedPlanRole === 'owner' ? 'border-[var(--landi-accent-copper-border)] bg-[var(--landi-accent-copper-soft)] text-[var(--landi-accent-copper-dark)]' : selectedPlanRole === 'editor' ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)]' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>{getPlanRoleLabel(selectedPlanRole)}</span></div><p className="text-[13px] font-medium leading-5 text-slate-500">식재 {selectedPlan.plants.length}개 · {selectedPlanUpdatedLabel}</p></div></div><div className="flex flex-wrap items-center gap-2">{selectedPlanRole === 'viewer' && <button type="button" onClick={exportPlanImage} disabled={isExporting} className={`${actionButtonClass} bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)] disabled:cursor-wait disabled:opacity-70`}><Download size={17} />{isExporting ? "내보내는 중" : "내보내기"}</button>}{canOpenSelectedPlanEditor && <button type="button" onClick={() => openEditor(selectedPlan.id)} className={`${actionButtonClass} bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}><Pencil size={17} />편집보드로</button>}{compactGuideButton}{authControls}{selectedPlanRole === 'owner' && <button type="button" onClick={() => deletePlan(selectedPlan.id)} className={`${actionButtonClass} border border-[var(--landi-danger-border)] bg-white text-[var(--landi-danger)] hover:bg-[var(--landi-danger-soft)]`}><Trash2 size={17} />삭제</button>}</div></div>{selectedPlanRole === 'viewer' && <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-500 shadow-sm">읽기전용 조감도는 현재 저장된 상태 그대로 확인하고 이미지로 내보낼 수 있습니다.</div>}</header>{authError && <div className="mx-auto mb-4 max-w-6xl rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-danger-dark)]" role="alert">{authError}</div>}<section className="mx-auto max-w-6xl overflow-auto rounded-md bg-white p-4 shadow-[0_24px_70px_rgba(47,55,43,0.14)]"><div ref={previewCanvasRef} data-export-board="true" className="w-fit"><StaticPlanBoard plan={selectedPlan} /></div></section></main>
  }

  if (!selectedPlan) return null

  return (
    <main data-theme="light" className="landi-app flex min-h-screen flex-col overflow-y-auto bg-[var(--landi-bg)] text-slate-900 lg:h-screen lg:min-h-0 lg:overflow-hidden lg:flex-row">
      <aside className={leftPanelClass}>
        <div className={`flex shrink-0 border-b border-slate-200 ${isPaletteCollapsed ? 'h-12 items-center justify-between px-2 lg:h-auto lg:flex-col lg:items-center lg:justify-start lg:border-b-0 lg:px-2 lg:py-3' : 'h-16 items-center px-4 md:px-5'}`}><div className={`flex min-w-0 items-center ${isPaletteCollapsed ? 'gap-2 lg:flex-col' : 'gap-2.5'}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm" title="Landi"><Trees size={20} /></div><div className={isPaletteCollapsed ? 'hidden' : ''}><h1 className="text-lg font-semibold tracking-normal">Landi</h1><p className="text-[13px] text-slate-500">편집보드</p></div></div>{isPaletteCollapsed && <span className="mx-1 h-6 w-px bg-slate-200 lg:mx-0 lg:my-3 lg:h-px lg:w-8" aria-hidden="true" />}<div className={`flex items-center gap-1.5 ${isPaletteCollapsed ? 'lg:flex-col' : 'ml-auto'}`}><button type="button" onClick={() => setMode('list')} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="목록으로" title="목록으로"><ArrowLeft size={17} /></button><button type="button" onClick={() => setIsPaletteCollapsed((collapsed) => !collapsed)} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={isPaletteCollapsed ? '식재 팔레트 펼치기' : '식재 팔레트 접기'} title={isPaletteCollapsed ? '식재 팔레트 펼치기' : '식재 팔레트 접기'}>{isPaletteCollapsed ? <><ChevronDown size={17} className="lg:hidden" /><PanelLeftOpen size={17} className="hidden lg:block" /></> : <><ChevronUp size={17} className="lg:hidden" /><PanelLeftClose size={17} className="hidden lg:block" /></>}</button></div></div>
        <section className={`flex min-h-0 flex-1 flex-col px-4 py-3 lg:overflow-hidden ${isPaletteCollapsed ? 'hidden' : ''}`}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">식재 팔레트</h2><Sprout size={17} className="text-[var(--landi-primary)]" /></div>{!hasPlanBackground && <div className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-500 shadow-sm">{canEditSelectedPlan ? '도면 업로드 후 식재를 도면 위에 배치할 수 있습니다.' : '읽기전용 권한에서는 식재 배치와 편집 기능을 사용할 수 없습니다.'}</div>}<div className="mb-3 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><button type="button" onClick={() => canEditSelectedPlan && setIsPaletteFormOpen((open) => !open)} disabled={!canEditSelectedPlan} className="landi-form-trigger flex h-10 w-full items-center justify-between gap-3 px-3 text-left font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"><span>{editingTemplateId ? "식재 타입 수정" : "식재 타입 등록"}</span><span className="rounded-sm bg-[var(--landi-primary-soft)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--landi-primary)]">{isPaletteFormVisible ? "닫기" : "열기"}</span></button>{isPaletteFormVisible && <div onKeyDown={handlePaletteFormKeyDown} className="grid gap-2 border-t border-slate-100 p-3"><select value={isTreeKind(newPlantKind) ? 'tree' : newPlantKind} onChange={(event) => setNewPlantKind(event.target.value === 'tree' ? 'deciduous' : event.target.value as PlantKind)} className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 outline-none focus:border-[var(--landi-primary)]"><option value="tree">나무</option><option value="groundcover">풀</option><option value="flower">꽃</option></select>{isTreeKind(newPlantKind) && <select value={newPlantKind === 'shrub' ? 'shrub' : 'canopy'} onChange={(event) => setNewPlantKind(event.target.value === 'shrub' ? 'shrub' : 'deciduous')} className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 outline-none focus:border-[var(--landi-primary)]"><option value="canopy">교목</option><option value="shrub">관목</option></select>}<input value={newPlantName} onChange={(event) => { setNewPlantName(event.target.value); if (paletteFormError) setPaletteFormError("") }} placeholder="식재명 예: 라벤더" aria-invalid={Boolean(paletteFormError)} className={`landi-form-control h-9 w-full min-w-0 rounded-md border px-2.5 outline-none focus:border-[var(--landi-primary)] ${paletteFormError ? "border-[var(--landi-danger)] bg-[var(--landi-danger-soft)]" : "border-slate-300"}`} />{paletteFormError && <p className="text-xs font-semibold text-[var(--landi-danger)]" role="alert">{paletteFormError}</p>}{newPlantKind === 'flower' && <div className="rounded-md border border-slate-200 bg-[var(--landi-panel)] p-2"><div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">꽃 색상</div><div className="grid grid-cols-6 gap-1.5">{flowerColorOptions.map((color) => <button key={color.value} type="button" onClick={() => setNewFlowerColor(color.value)} title={color.name} className={`h-7 rounded-md border shadow-sm ${newFlowerColor === color.value ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`} style={{ backgroundColor: color.value }} aria-label={`${color.name} 꽃 색상 선택`} />)}</div></div>}<input value={newPlantLabel} onChange={(event) => { setNewPlantLabel(event.target.value); if (paletteFormError) setPaletteFormError("") }} placeholder="학명/메모 선택" className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 px-2.5 outline-none focus:border-[var(--landi-primary)]" /><button type="button" onClick={addTemplateToPalette} className="landi-form-control inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--landi-primary)] px-3 text-white shadow-sm transition hover:bg-[var(--landi-primary-dark)]"><Plus size={16} />{editingTemplateId ? "팔레트 수정" : "팔레트 등록"}</button>{editingTemplateId && <button type="button" onClick={resetPaletteForm} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition hover:bg-slate-50">수정 취소</button>}</div>}</div><div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
                <div className="pointer-events-none absolute left-2 top-[calc(100%+6px)] z-30 hidden w-max max-w-[230px] rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block">
                  <p className="truncate text-xs font-semibold text-slate-800">{template.name}</p>
                  <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{template.label}</p>
                  {getTreeScaleLabel(template.kind) && <p className="mt-1 text-[11px] font-semibold text-[var(--landi-primary)]">{getTreeScaleLabel(template.kind)}</p>}
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
</div></section>
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-[64px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[var(--landi-panel)] px-4 py-3 md:px-6"><div className="flex min-w-[240px] flex-1 items-center gap-2 overflow-hidden"><label className={`group flex h-9 min-w-[180px] max-w-[620px] flex-[1_1_620px] items-center gap-2 rounded-md border px-2 transition ${canEditSelectedPlan ? 'cursor-text border-transparent hover:border-[var(--landi-primary-border)] hover:bg-white/60 focus-within:border-[var(--landi-primary)] focus-within:bg-white/80 focus-within:shadow-sm' : 'cursor-default border-transparent bg-transparent'}`}><span className="sr-only">조감도 제목</span><input value={selectedPlan.title} onChange={(event) => updateSelectedPlan({ title: event.target.value })} disabled={!canEditSelectedPlan} className="landi-title-input min-w-[120px] w-full bg-transparent text-[19px] leading-6 tracking-normal text-slate-900 outline-none disabled:cursor-default" aria-label="조감도 제목" /><Pencil size={16} className={`shrink-0 text-slate-400 transition ${canEditSelectedPlan ? 'group-hover:text-[var(--landi-primary)]' : 'opacity-0'}`} aria-hidden="true" /></label><span className="hidden max-w-[180px] shrink truncate text-[12px] font-medium leading-4 text-slate-500 xl:inline">{selectedPlanUpdatedLabel}</span>{saveStatus !== 'saved' && <span className={`hidden shrink-0 text-[12px] font-medium leading-4 xl:inline ${saveStatusClass}`} role="status">{saveStatusLabel}</span>}</div><div className="flex flex-wrap items-center gap-2">{authControls}{compactGuideButton}<button type="button" onClick={exportPlanImage} disabled={isExporting} className={`${actionButtonClass} bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)] disabled:cursor-wait disabled:opacity-70`}><Download size={17} />{isExporting ? "내보내는 중" : "내보내기"}</button>{canEditSelectedPlan && <label title="도면 업로드" aria-label="도면 업로드" className="grid h-10 w-10 cursor-pointer place-items-center rounded-md bg-[var(--landi-accent-copper)] text-white shadow-sm transition hover:bg-[var(--landi-accent-copper-dark)]"><ImagePlus size={18} /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" /></label>}</div></header>
        {authError && <div className="mx-4 mt-3 rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-danger-dark)]" role="alert">{authError}</div>}
        {!canEditSelectedPlan && <div className="mx-4 mt-3 rounded-md border border-[var(--landi-warning-border)] bg-[var(--landi-warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-warning-dark)]">읽기전용 권한입니다. 조감도 확인과 이미지 내보내기만 사용할 수 있습니다.</div>}
        {exportError && <div className="mx-4 mt-3 rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--landi-danger-dark)]" role="alert">{exportError}</div>}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-0 md:p-2 lg:p-2">
          <div className={`transition duration-200 ${shouldShowOrientationLock ? 'pointer-events-none opacity-25 blur-[1px]' : ''}`}>
            <div ref={boardFrameRef} className="relative mx-auto w-full max-w-[1120px] rounded-md bg-white p-1.5 shadow-[0_18px_48px_rgba(47,55,43,0.12)] md:p-2">
              <div className="relative overflow-hidden" style={{ width: Math.ceil(BOARD_WIDTH * boardScale), maxWidth: '100%', height: Math.ceil(BOARD_HEIGHT * boardScale) }}>
                
                <div ref={canvasRef} data-export-board="true" onClick={() => setSelectedPlantId(null)} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="relative origin-top-left overflow-visible border" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `scale(${boardScale})`, backgroundColor: '#f7f7f2', borderColor: '#d8ded4' }}>{selectedPlan.backgroundUrl && <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,${backgroundOverlay}), rgba(255,255,255,${backgroundOverlay})), url(${selectedPlan.backgroundUrl})`, filter: `saturate(${backgroundSaturation}%)` }} />}{!selectedPlan.backgroundUrl && selectedPlan.plants.length === 0 && <div className="absolute left-1/2 top-1/2 z-10 w-[min(432px,calc(100%-48px))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-dashed border-slate-300 bg-white/92 px-5 py-6 text-center shadow-sm backdrop-blur-sm"><div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-500"><ImagePlus size={22} /></div><p className="mt-3 text-[15px] font-semibold text-slate-900">{EMPTY_PLAN_TITLE}</p><p className="mt-1.5 text-[13px] leading-5 text-slate-500">도면을 업로드하면 편집보드에서 바로 배치를 시작할 수 있습니다.</p>{canEditSelectedPlan ? <label className="landi-form-control mx-auto mt-4 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--landi-accent-copper)] px-3 text-white shadow-sm transition hover:bg-[var(--landi-accent-copper-dark)]"><ImagePlus size={16} />도면 업로드<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" /></label> : <p className="mt-3 text-[12px] font-medium text-slate-400">읽기전용 권한에서는 도면을 업로드할 수 없습니다.</p>}</div>}{visiblePlants.map((plant) => <PlacedPlant key={plant.instanceId} plant={plant} selected={selectedPlantId === plant.instanceId} plantIntensity={plantIntensity} showLabel={showPlantLabels && representativeLabelIds.has(plant.instanceId)} boardScale={boardScale} readOnly={!canEditSelectedPlan} onSelect={() => setSelectedPlantId(plant.instanceId)} onMove={(updates) => updatePlant(plant.instanceId, updates)} onResize={(updates) => updatePlant(plant.instanceId, updates)} />)}{selectedPlant && canEditSelectedPlan && selectedPlantToolbarStyle && <div className="export-hidden absolute z-30 flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur" style={selectedPlantToolbarStyle} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}><button type="button" onClick={() => updatePlant(selectedPlant.instanceId, { size: clampPlantSize(selectedPlant.size - PLANT_SIZE_STEP) })} disabled={selectedPlant.size <= PLANT_SIZE_MIN} className="grid h-8 w-8 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent" aria-label="선택 식물 축소"><Minus size={16} /></button><span className="group/size relative grid min-w-[52px] px-1 text-center leading-none"><span className="text-xs font-semibold text-slate-700">{Math.round(selectedPlant.size)}px</span><span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-40 hidden w-max max-w-[180px] -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.16)] group-hover/size:block"><span className="block text-[11px] font-semibold text-slate-800">크기 {PLANT_SIZE_MIN}-{PLANT_SIZE_MAX}px</span><span className="mt-1 block text-[11px] font-medium text-slate-500">버튼 ±{PLANT_SIZE_STEP}px · 드래그 자유</span></span></span><button type="button" onClick={() => updatePlant(selectedPlant.instanceId, { size: clampPlantSize(selectedPlant.size + PLANT_SIZE_STEP) })} disabled={selectedPlant.size >= PLANT_SIZE_MAX} className="grid h-8 w-8 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent" aria-label="선택 식물 확대"><Plus size={16} /></button><span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" /><button type="button" onClick={deleteSelectedPlant} className="grid h-8 w-8 place-items-center rounded-md text-[var(--landi-danger)] hover:bg-[var(--landi-danger-soft)]" aria-label="선택 식물 삭제"><Trash2 size={16} /></button></div>}</div>
              </div>
            </div>
          </div>
          {shouldShowOrientationLock && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="orientation-lock-title">
              <div className="w-full max-w-[420px] rounded-md border border-white/70 bg-white px-5 py-5 text-center shadow-[0_24px_70px_rgba(15,23,42,0.35)]">
                <p id="orientation-lock-title" className="text-lg font-semibold text-slate-950">가로모드에 최적화되어 있습니다</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">태블릿을 가로로 돌리면 도면과 식재 위치를 더 넓고 정확하게 편집할 수 있습니다.</p>
                {!isMobileViewport && <button type="button" onClick={() => setAllowPortraitEditing(true)} className={`${actionButtonClass} mt-4 bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}>세로에서 계속하기</button>}
              </div>
            </div>
          )}
        </div>
      </section>
      <aside className="flex max-h-[48vh] min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-[var(--landi-panel)] lg:h-screen lg:max-h-none lg:w-auto lg:flex-row lg:border-l lg:border-t-0">
        <nav className="flex h-12 shrink-0 items-center justify-center gap-1 border-b border-slate-200 px-2 lg:h-full lg:w-14 lg:flex-col lg:justify-start lg:border-b-0 lg:border-r lg:px-2 lg:py-3" aria-label="편집 도구">
          <button type="button" onClick={() => toggleToolPanel('share')} className={toolRailButtonClass('share')} aria-label="공유" title="공유"><Users size={18} /></button>
          <button type="button" onClick={() => toggleToolPanel('board')} className={toolRailButtonClass('board')} aria-label="보드 설정" title="보드 설정"><SlidersHorizontal size={18} /></button>
          <button type="button" onClick={() => toggleToolPanel('schedule')} className={toolRailButtonClass('schedule')} aria-label="수량 집계" title="수량 집계"><ClipboardList size={18} /></button>
          <span className="mx-1 h-6 w-px bg-slate-200 lg:mx-0 lg:my-1 lg:h-px lg:w-8" aria-hidden="true" />
          <button type="button" onClick={toggleRightPanel} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label={activeToolPanel ? '우측 패널 접기' : '우측 패널 펼치기'} title={activeToolPanel ? '우측 패널 접기' : '우측 패널 펼치기'}>{activeToolPanel ? <><ChevronUp size={17} className="lg:hidden" /><PanelRightClose size={17} className="hidden lg:block" /></> : <><ChevronDown size={17} className="lg:hidden" /><PanelRightOpen size={17} className="hidden lg:block" /></>}</button>
        </nav>
        {activeToolPanel && <section className={`min-h-0 flex-1 px-4 py-3 md:px-5 lg:w-[286px] lg:flex-none ${activeToolPanel === 'schedule' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-700">{toolPanelLabel}</h2></div>
          {activeToolPanel === 'share' && <div className="grid gap-3"><div className="rounded-md border border-[var(--landi-accent-copper-border)] bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[13px] font-semibold leading-5 text-slate-800">프로젝트 공유</p><p className="mt-0.5 truncate text-[12px] text-slate-500" title={ownerLabel}>{ownerLabel}</p></div><span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${selectedPlanRole === 'owner' ? 'bg-[var(--landi-accent-copper-soft)] text-[var(--landi-accent-copper-dark)]' : selectedPlanRole === 'editor' ? 'bg-[var(--landi-primary-soft)] text-[var(--landi-primary)]' : 'bg-slate-100 text-slate-500'}`}>{roleLabel}</span></div></div>{authUser ? <>{canManageSelectedPlan ? <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm"><input value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); if (inviteError) setInviteError(''); if (inviteStatus) setInviteStatus('') }} placeholder="이메일로 초대" className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 px-2.5 outline-none focus:border-[var(--landi-primary)]" /><p className="text-[12px] leading-5 text-slate-500">Google 로그인에 사용할 수 있는 이메일만 초대할 수 있습니다.</p><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Exclude<PlanRole, 'owner'>)} className="landi-form-control h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 outline-none focus:border-[var(--landi-primary)]"><option value="viewer">읽기전용</option><option value="editor">수정가능</option></select><button type="button" onClick={inviteMember} disabled={isInviting} className="landi-form-control inline-flex h-9 min-w-[54px] items-center justify-center rounded-md bg-[var(--landi-accent-copper)] px-3 text-white shadow-sm transition hover:bg-[var(--landi-accent-copper-dark)] disabled:cursor-wait disabled:opacity-70">{isInviting ? '발송중' : '초대'}</button></div>{inviteError && <p className="text-[12px] font-semibold text-[var(--landi-danger)]" role="alert">{inviteError}</p>}{inviteStatus && <p className="text-[12px] font-semibold text-[var(--landi-primary)]" role="status">{inviteStatus}</p>}</div> : <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-[13px] leading-6 text-slate-500 shadow-sm">{selectedPlanRole === 'viewer' ? '읽기전용 권한에서는 프로젝트 공유와 초대를 변경할 수 없습니다.' : '초대와 권한 변경은 소유자만 할 수 있습니다.'}</div>}</> : <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-[13px] leading-6 text-slate-500 shadow-sm">Google 로그인 후 조감도를 공유할 수 있습니다.</div>}<div className="grid gap-2"><div className="flex items-center justify-between"><h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">멤버</h3><span className="text-[11px] font-semibold text-slate-400">{(selectedPlan.members ?? []).length}</span></div>{(selectedPlan.members ?? []).length > 0 ? (selectedPlan.members ?? []).map((member) => <div key={member.email} className="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[var(--landi-primary-soft)] text-[11px] font-bold text-[var(--landi-primary)]" title={member.email} aria-hidden="true">{getMemberInitial(member.email)}</div><div className="min-w-0"><p className="truncate text-[12px] font-semibold leading-4 text-slate-500">{getMemberStatusLabel(member.status)}</p><p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-slate-500"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${member.status === 'joined' ? 'bg-[var(--landi-primary)]' : 'bg-slate-300'}`} aria-hidden="true" /><span>{getMemberRoleLabel(member.role)}</span></p></div>{canManageSelectedPlan && <div className="flex shrink-0 items-center gap-1"><select value={member.role} onChange={(event) => updateMemberRole(member.email, event.target.value as Exclude<PlanRole, 'owner'>)} className="landi-compact-control h-8 w-[58px] rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-600 outline-none transition focus:border-[var(--landi-primary)] focus:ring-2 focus:ring-[var(--landi-primary)]/10"><option value="viewer">읽기</option><option value="editor">수정</option></select><button type="button" onClick={() => removeMember(member.email)} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-[var(--landi-danger-soft)] hover:text-[var(--landi-danger)]" aria-label={`${member.email} 초대 제거`}><Trash2 size={13} /></button></div>}<div className="pointer-events-none absolute left-3 top-[calc(100%+6px)] z-30 hidden w-max max-w-[230px] rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block"><p className="truncate text-[12px] font-semibold text-slate-800">{member.email}</p><p className="mt-1 text-[11px] font-medium text-slate-500">{getMemberRoleLabel(member.role)} · {getMemberStatusLabel(member.status)}</p></div></div>) : <div className="rounded-md border border-dashed border-slate-200 bg-white/70 px-3 py-4 text-[12px] text-slate-400">아직 초대된 멤버가 없습니다.</div>}</div></div>}
          {activeToolPanel === 'board' && <div className="grid gap-3">{!canUseBoardControls && <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-500 shadow-sm">{canEditSelectedPlan ? '도면 업로드 후 보드 설정과 식재 배치 기능을 사용할 수 있습니다.' : '읽기전용 권한에서는 보드 설정을 변경할 수 없습니다.'}</div>}<div className={`grid gap-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200 ${!canUseBoardControls ? 'opacity-60' : ''}`}><h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">도면</h3><label className="grid gap-1.5 text-[13px] font-semibold text-slate-700"><span className="flex items-center justify-between"><span>밝기</span><span className="text-[11px] font-semibold text-slate-400">{backgroundFade}%</span></span><input type="range" min="0" max="100" value={backgroundFade} onChange={(event) => updateSelectedPlan({ backgroundFade: Number(event.target.value) })} disabled={!canUseBoardControls} className="landi-range disabled:cursor-not-allowed" /></label><label className="grid gap-1.5 text-[13px] font-semibold text-slate-700"><span className="flex items-center justify-between"><span>채도</span><span className="text-[11px] font-semibold text-slate-400">{backgroundSaturation}%</span></span><input type="range" min="0" max="100" value={backgroundSaturation} onChange={(event) => updateSelectedPlan({ backgroundSaturation: Number(event.target.value) })} disabled={!canUseBoardControls} className="landi-range disabled:cursor-not-allowed" /></label></div><div className={`grid gap-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200 ${!canUseBoardControls ? 'opacity-60' : ''}`}><h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">식재</h3><label className="grid gap-1.5 text-[13px] font-semibold text-slate-700"><span className="flex items-center justify-between"><span>진하기</span><span className="text-[11px] font-semibold text-slate-400">{plantIntensity}%</span></span><input type="range" min="0" max="100" value={plantIntensity} onChange={(event) => updateSelectedPlan({ plantIntensity: Number(event.target.value) })} disabled={!canUseBoardControls} className="landi-range disabled:cursor-not-allowed" /></label><div className="grid gap-1.5"><div className="flex items-center justify-between"><span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">식재 이름 라벨</span><span className="text-[11px] font-semibold text-slate-400">{showPlantLabels ? '표시' : '숨김'}</span></div><button type="button" onClick={() => updateSelectedPlan({ showPlantLabels: !showPlantLabels })} disabled={!canUseBoardControls} className={`landi-type-toggle flex h-7 items-center justify-between rounded-md border px-2 transition ${showPlantLabels ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)] shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-700'} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:text-inherit`} aria-pressed={showPlantLabels}><span className="flex items-center gap-1.5"><span className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border ${showPlantLabels ? 'border-[var(--landi-primary)] bg-[var(--landi-primary)] text-white' : 'border-slate-300 bg-white text-transparent'}`} aria-hidden="true">{showPlantLabels && <Check size={10} strokeWidth={3} />}</span><span className="text-[12px] font-medium">대표 이름 표시</span></span><span className="text-[11px] font-semibold text-slate-400">대표 1개</span></button></div><div className="grid gap-1.5"><div className="flex items-center justify-between"><span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">보이는 식재 유형</span><span className="text-[11px] font-semibold text-slate-400">{plantCategories.filter((category) => visiblePlantCategories[category] ?? true).length}/{plantCategories.length}</span></div><div className="grid grid-cols-3 gap-1">{plantCategories.map((category) => { const isActive = visiblePlantCategories[category] ?? true; return <button key={category} type="button" onClick={() => togglePlantCategoryVisibility(category)} disabled={!canUseBoardControls} className={`landi-type-toggle flex h-7 items-center justify-center gap-1 rounded-md border px-1 transition ${isActive ? 'border-[var(--landi-primary-border)] bg-[var(--landi-primary-soft)] text-[var(--landi-primary)] shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-700'} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:text-inherit`} aria-pressed={isActive}><span className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border ${isActive ? 'border-[var(--landi-primary)] bg-[var(--landi-primary)] text-white' : 'border-slate-300 bg-white text-transparent'}`} aria-hidden="true">{isActive && <Check size={10} strokeWidth={3} />}</span><span className="text-[12px] font-medium">{category}</span></button> })}</div></div><p className="text-[12px] leading-5 text-slate-500">이름 라벨은 같은 식재가 여러 개 있어도 대표 1개만 표시합니다. 선택한 유형만 도면과 내보내기에 남습니다.</p></div>{canEditSelectedPlan && <div className={`grid gap-2 rounded-md border border-[var(--landi-danger-border)] bg-white p-3 shadow-sm ${!hasPlanBackground ? 'opacity-60' : ''}`}><div><p className="text-[13px] font-semibold text-[var(--landi-danger)]">배치 식재 삭제</p><p className="mt-1 text-[12px] leading-5 text-slate-500">도면 위에 배치된 식재만 삭제됩니다. 식재 팔레트와 도면은 유지됩니다.</p></div><button type="button" onClick={() => setIsClearPlantsConfirmOpen(true)} disabled={!hasPlanBackground || selectedPlan.plants.length === 0} className="landi-form-control inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--landi-danger-border)] bg-white px-3 text-[12px] font-semibold text-[var(--landi-danger)] shadow-sm transition hover:bg-[var(--landi-danger-soft)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"><Trash2 size={15} />식재 모두 삭제</button></div>}</div>}
          {activeToolPanel === 'schedule' && <div className="flex min-h-0 flex-1 flex-col gap-3"><div className="shrink-0 rounded-md border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">배치 수량</span><span className="rounded-md bg-[var(--landi-primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--landi-primary)]">총 {selectedPlan.plants.length}</span></div><p className="mt-2 text-[12px] leading-5 text-slate-500">도면에 배치된 식재를 유형별로 자동 집계해 보여줍니다.</p></div><div className="min-h-0 flex-1 overflow-y-auto pr-1">{groupedInventory.length > 0 ? <div className="grid min-w-0 grid-cols-1 gap-3">{groupedInventory.map((group) => <section key={group.category} className="min-w-0"><div className="mb-1.5 flex items-center justify-between gap-2 px-0.5"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.colors.primary }} /><h3 className="truncate text-[12px] font-semibold uppercase tracking-wide text-slate-500">{group.label}</h3></div><span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">{group.total}</span></div><div className="grid min-w-0 grid-cols-1 gap-2">{(group.category === '나무' ? groupTreeScaleItems(group.items) : [{ label: null, items: group.items }]).map((section) => <div key={section.label ?? group.category} className="grid min-w-0 gap-1.5">{section.label && <div className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{section.label}</div>}{section.items.map((item) => <div key={item.id} className="group relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 shadow-sm"><InventoryPlantIcon plant={item} /><div className="min-w-0 overflow-hidden"><p className="truncate text-sm font-semibold leading-5 text-slate-800" title={item.name}>{item.name}</p><p className="botanical-name truncate text-xs leading-4 text-slate-500" title={item.label}>{item.label}</p></div><span className="shrink-0 text-lg font-semibold text-slate-900">{item.count}</span><div className="pointer-events-none absolute left-3 top-[calc(100%+6px)] z-30 hidden w-max max-w-[230px] rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block"><p className="truncate text-[12px] font-semibold text-slate-800">{item.name}</p><p className="mt-1 truncate text-[11px] font-medium text-slate-500">{item.label}</p><p className="mt-1 text-[11px] font-semibold text-[var(--landi-primary)]">{section.label ? `${group.label} · ${section.label}` : group.label} · 수량 {item.count}</p></div></div>)}</div>)}</div></section>)}</div> : <div className="flex h-full min-h-[180px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-white/70 px-3 py-8 text-[12px] leading-5 text-slate-400">아직 도면에 배치된 식재가 없습니다.</div>}</div></div>}
        </section>}
      </aside>
      {isClearPlantsConfirmOpen && <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-5 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="clear-plants-title"><div className="w-full max-w-[360px] rounded-md border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.28)]"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--landi-danger-soft)] text-[var(--landi-danger)]"><Trash2 size={19} /></div><div className="min-w-0"><h2 id="clear-plants-title" className="text-[15px] font-semibold leading-6 text-slate-950">배치된 식재를 모두 제거할까요?</h2><p className="mt-1.5 text-[13px] leading-5 text-slate-500">도면 위에 배치된 식재만 삭제됩니다. 식재 팔레트와 도면은 유지됩니다.</p></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIsClearPlantsConfirmOpen(false)} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50">취소</button><button type="button" onClick={clearPlacedPlants} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md bg-[var(--landi-danger)] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[var(--landi-danger-dark)]">모두 제거</button></div></div></div>}
    </main>
  )
}

export default App









