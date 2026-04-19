
import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent } from 'react'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'
import { ArrowLeft, Download, Eye, ImagePlus, Layers, Minus, Moon, MousePointer2, Pencil, Plus, Sprout, Sun, Trash2, Trees } from 'lucide-react'
import { PlanBase } from './components/canvas/PlanBase'
import { PlantSymbol } from './components/canvas/PlantSymbol'
import { BOARD_HEIGHT, BOARD_WIDTH, defaultPalette, flowerColorOptions, kindOptions, plantToneOptions, STORAGE_KEY } from './data/plants'
import type { Plan, Plant, PlantKind, PlantTemplate, ViewMode } from './types'

function createPlan(title = '새 조감도'): Plan {
  return { id: `plan-${crypto.randomUUID()}`, title, updatedAt: new Date().toISOString(), backgroundUrl: null, palette: defaultPalette, plants: [], backgroundFade: 62, plantIntensity: 125 }
}

function loadPlans(): Plan[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return [createPlan('대상지 조감도')]
    const parsed = JSON.parse(saved) as Plan[]
    return parsed.length > 0 ? parsed : [createPlan('대상지 조감도')]
  } catch {
    return [createPlan('대상지 조감도')]
  }
}

function createTemplate(kind: PlantKind, name: string, label = '', flowerAccent = flowerColorOptions[0].value): PlantTemplate {
  const option = kindOptions.find((item) => item.kind === kind) ?? kindOptions[0]
  const toneSet = plantToneOptions[kind]
  const generatedTone = toneSet?.[Math.floor(Math.random() * toneSet.length)]
  const colors = kind === 'flower' ? { ...option.colors, accent: flowerAccent } : (generatedTone ?? option.colors)
  return { id: `${kind}-${crypto.randomUUID()}`, kind, category: option.category, name: name.trim(), label: label.trim() || option.label, size: option.size, colors }
}
type ResizeAnchor = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

function ResizeHandle({ anchor, onResizeStart }: { anchor: ResizeAnchor; onResizeStart: (anchor: ResizeAnchor, event: ReactPointerEvent<HTMLButtonElement>) => void }) {
  const positionMap: Record<ResizeAnchor, string> = {
    n: 'left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize',
    e: '-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
    s: 'left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize',
    w: '-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
    ne: '-right-1.5 -top-1.5 cursor-nesw-resize',
    nw: '-left-1.5 -top-1.5 cursor-nwse-resize',
    se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
    sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
  }

  return <button type="button" onPointerDown={(event) => onResizeStart(anchor, event)} className={`resize-handle export-hidden absolute h-3 w-3 touch-none rounded-[2px] border shadow-sm ${positionMap[anchor]}`} style={{ backgroundColor: '#2563eb', borderColor: '#ffffff' }} aria-label={`식재 ${anchor} 방향 크기 조절`} />
}

function PlacedPlant({ plant, selected, plantIntensity, onSelect, onMove, onResize }: { plant: Plant; selected: boolean; plantIntensity: number; onSelect: () => void; onMove: (updates: Pick<Plant, 'x' | 'y'>) => void; onResize: (updates: Pick<Plant, 'x' | 'y' | 'size'>) => void }) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const handles: ResizeAnchor[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const symbolOpacity = Math.min(1, Math.max(0.55, plantIntensity / 100))
  const symbolFilter = `saturate(${Math.max(100, plantIntensity)}%) contrast(${Math.max(100, plantIntensity - 8)}%)`

  const startResize = (anchor: ResizeAnchor, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startSize = plant.size
    const startPlantX = plant.x
    const startPlantY = plant.y

    const move = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const horizontalDelta = anchor.includes('e') ? deltaX : anchor.includes('w') ? -deltaX : 0
      const verticalDelta = anchor.includes('s') ? deltaY : anchor.includes('n') ? -deltaY : 0
      const delta = anchor.length === 2 ? Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta : horizontalDelta || verticalDelta
      const nextSize = Math.min(190, Math.max(28, startSize + delta))
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
    <Draggable nodeRef={nodeRef} position={{ x: plant.x, y: plant.y }} bounds="parent" cancel=".resize-handle" onStop={(_: DraggableEvent, data: DraggableData) => onMove({ x: data.x, y: data.y })}>
      <div ref={nodeRef} onClick={(event) => { event.stopPropagation(); onSelect() }} className="group absolute cursor-move touch-none select-none" style={{ width: plant.size + 56, height: plant.size + 54, filter: 'drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))' }}>
        <div className={`absolute left-4 top-3 ${selected ? 'rounded-md outline outline-1 outline-offset-1' : ''}`} style={{ opacity: selected ? Math.min(0.92, symbolOpacity) : symbolOpacity, filter: symbolFilter, outlineColor: selected ? '#2563eb' : undefined }}>
          <PlantSymbol plant={plant} />
        </div>
        <div className="export-hidden pointer-events-none absolute left-1/2 top-[calc(100%-10px)] -translate-x-1/2 whitespace-nowrap rounded-sm px-2 py-0.5 text-[10px] font-semibold opacity-0 shadow-sm transition-opacity group-hover:opacity-100" style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)', color: '#ffffff' }}>{plant.name}</div>
        {selected && handles.map((anchor) => <ResizeHandle key={anchor} anchor={anchor} onResizeStart={startResize} />)}
      </div>
    </Draggable>
  )
}
function PlanThumbnail({ plan }: { plan: Plan }) {
  const scale = 0.22
  return (
    <div className="relative aspect-[1120/640] overflow-hidden rounded-md border border-[#d8ded4] bg-[#f7f7f2]">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `scale(${scale})` }}>
        <StaticPlanBoard plan={plan} />
      </div>
    </div>
  )
}
function StaticPlanBoard({ plan }: { plan: Plan }) {
  const backgroundFade = plan.backgroundFade ?? 62
  const plantIntensity = plan.plantIntensity ?? 125
  const overlay = Math.min(0.86, Math.max(0, backgroundFade / 100))
  const symbolOpacity = Math.min(1, Math.max(0.55, plantIntensity / 100))
  const symbolFilter = `saturate(${Math.max(100, plantIntensity)}%) contrast(${Math.max(100, plantIntensity - 8)}%)`

  return (
    <div className="relative h-[640px] w-[1120px] overflow-visible border border-[#d8ded4] bg-[#f7f7f2]">
      {plan.backgroundUrl ? (
        <div className="absolute inset-0 bg-contain bg-center bg-no-repeat grayscale-[45%] saturate-50" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,${overlay}), rgba(255,255,255,${overlay})), url(${plan.backgroundUrl})` }} />
      ) : (
        <PlanBase fade={plan.backgroundFade ?? 62} />
      )}
      {plan.plants.map((plant) => (
        <div key={plant.instanceId} className="absolute touch-none select-none" style={{ left: plant.x, top: plant.y, width: plant.size + 56, height: plant.size + 54, filter: 'drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))' }}>
          <div className="absolute left-4 top-3" style={{ opacity: symbolOpacity, filter: symbolFilter }}>
            <PlantSymbol plant={plant} />
          </div>
        </div>
      ))}
    </div>
  )
}
function App() {
  const [plans, setPlans] = useState<Plan[]>(loadPlans)
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? '')
  const [mode, setMode] = useState<ViewMode>('list')
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)
  const [newPlantKind, setNewPlantKind] = useState<PlantKind>('deciduous')
  const [newPlantName, setNewPlantName] = useState('')
  const [newPlantLabel, setNewPlantLabel] = useState('')
  const [newFlowerColor, setNewFlowerColor] = useState(flowerColorOptions[0].value)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [isPaletteFormOpen, setIsPaletteFormOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [paletteFormError, setPaletteFormError] = useState('')
  const [exportError, setExportError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0]
  const selectedPlant = selectedPlan?.plants.find((plant) => plant.instanceId === selectedPlantId)

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)), [plans])

  const updateSelectedPlan = (updates: Partial<Plan>) => {
    if (!selectedPlan) return
    setPlans((current) => current.map((plan) => plan.id === selectedPlan.id ? { ...plan, ...updates, updatedAt: new Date().toISOString() } : plan))
  }
  const updatePlants = (updater: (plants: Plant[]) => Plant[]) => selectedPlan && updateSelectedPlan({ plants: updater(selectedPlan.plants) })

  const inventory = useMemo(() => selectedPlan?.palette.map((template) => ({ ...template, count: selectedPlan.plants.filter((plant) => plant.templateId === template.id).length })) ?? [], [selectedPlan])

  const createNewPlan = () => {
    const next = createPlan(`새 조감도 ${plans.length + 1}`)
    setPlans((current) => [next, ...current])
    setSelectedPlanId(next.id)
    setSelectedPlantId(null)
    setMode('edit')
  }
  const deletePlan = (planId: string) => {
    const nextPlans = plans.filter((plan) => plan.id !== planId)
    const fallback = nextPlans[0] ?? createPlan('새 조감도')
    setPlans(nextPlans.length > 0 ? nextPlans : [fallback])
    if (selectedPlanId === planId) { setSelectedPlanId(fallback.id); setSelectedPlantId(null); setMode('list') }
  }
  const openPreview = (planId: string) => { setSelectedPlanId(planId); setSelectedPlantId(null); setMode('preview') }
  const openEditor = (planId: string) => { setSelectedPlanId(planId); setSelectedPlantId(null); setMode('edit') }
  const resetPaletteForm = () => {
    setEditingTemplateId(null)
    setNewPlantKind('deciduous')
    setNewPlantName('')
    setNewPlantLabel('')
    setNewFlowerColor(flowerColorOptions[0].value)
  }

  const startEditTemplate = (template: PlantTemplate) => {
    setEditingTemplateId(template.id)
    setNewPlantKind(template.kind)
    setNewPlantName(template.name)
    setNewPlantLabel(template.label)
    setNewFlowerColor(template.colors.accent)
    setPaletteFormError('')
    setIsPaletteFormOpen(true)
  }

  const validatePaletteForm = () => {
    if (!selectedPlan) return '조감도를 먼저 선택해주세요.'
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
    if (!selectedPlan) return
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

  const deleteTemplateFromPalette = (templateId: string) => {
    if (!selectedPlan) return
    updateSelectedPlan({
      palette: selectedPlan.palette.filter((template) => template.id !== templateId),
      plants: selectedPlan.plants.filter((plant) => plant.templateId !== templateId),
    })
    if (editingTemplateId === templateId) resetPaletteForm()
    if (selectedPlant?.templateId === templateId) setSelectedPlantId(null)
  }
  const addPlant = (template: PlantTemplate, x = 520, y = 330) => {
    const instanceId = `${template.id}-${crypto.randomUUID()}`
    updatePlants((current) => [...current, { ...template, instanceId, templateId: template.id, x: x - template.size / 2, y: y - template.size / 2 }])
    setSelectedPlantId(instanceId)
  }
  const updatePlant = (instanceId: string, updates: Partial<Plant>) => updatePlants((current) => current.map((plant) => plant.instanceId === instanceId ? { ...plant, ...updates } : plant))
  const deleteSelectedPlant = () => { if (selectedPlantId) { updatePlants((current) => current.filter((plant) => plant.instanceId !== selectedPlantId)); setSelectedPlantId(null) } }
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateSelectedPlan({ backgroundUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!selectedPlan) return
    const template = selectedPlan.palette.find((item) => item.id === event.dataTransfer.getData('template-id'))
    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    if (template && canvasBounds) addPlant(template, event.clientX - canvasBounds.left, event.clientY - canvasBounds.top)
  }
  const exportPlanImage = async () => {
    if (!canvasRef.current || !selectedPlan || isExporting) return
    setExportError('')
    setIsExporting(true)

    type ExportFormat = 'png' | 'jpg'
    type SaveFilePicker = (options: {
      suggestedName?: string
      types?: Array<{ description: string; accept: Record<string, string[]> }>
      excludeAcceptAllOption?: boolean
    }) => Promise<FileSystemFileHandle>

    const exportNode = canvasRef.current
    const baseFileName = `${selectedPlan.title || 'landi-plan'}-${new Date().toISOString().slice(0, 10)}`
    const savePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
    let exportFormat: ExportFormat = 'png'
    let saveHandle: FileSystemFileHandle | null = null

    try {
      if (savePicker) {
        saveHandle = await savePicker({
          suggestedName: `${baseFileName}.png`,
          types: [
            { description: 'PNG 이미지', accept: { 'image/png': ['.png'] } },
            { description: 'JPG 이미지', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } },
          ],
          excludeAcceptAllOption: false,
        })

        const savedName = saveHandle.name.toLowerCase()
        exportFormat = savedName.endsWith('.jpg') || savedName.endsWith('.jpeg') ? 'jpg' : 'png'
      }

      exportNode.classList.add('landi-exporting')
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const canvas = await html2canvas(exportNode, {
        backgroundColor: exportFormat === 'jpg' ? '#ffffff' : isDarkMode ? '#11170f' : '#f7f7f2',
        ignoreElements: (element) => element.classList.contains('export-hidden'),
        onclone: (documentClone) => {
          const cloneWindow = documentClone.defaultView
          const clonedBoard = documentClone.querySelector('[data-export-board="true"]')
          if (!cloneWindow || !clonedBoard) return

          ;[clonedBoard, ...Array.from(clonedBoard.querySelectorAll('*'))].forEach((node) => {
            if (!(node instanceof cloneWindow.HTMLElement) && !(node instanceof cloneWindow.SVGElement)) return
            const computed = cloneWindow.getComputedStyle(node)
            const style = (node as HTMLElement | SVGElement).style
            const safeColor = (value: string, fallback: string) => value.includes('oklch') ? fallback : value

            style.setProperty('color', safeColor(computed.color, '#172019'), 'important')
            style.setProperty('background-color', safeColor(computed.backgroundColor, 'rgba(0, 0, 0, 0)'), 'important')
            style.setProperty('border-top-color', safeColor(computed.borderTopColor, '#d8ded4'), 'important')
            style.setProperty('border-right-color', safeColor(computed.borderRightColor, '#d8ded4'), 'important')
            style.setProperty('border-bottom-color', safeColor(computed.borderBottomColor, '#d8ded4'), 'important')
            style.setProperty('border-left-color', safeColor(computed.borderLeftColor, '#d8ded4'), 'important')
            style.setProperty('outline-color', safeColor(computed.outlineColor, '#2563eb'), 'important')
            style.setProperty('text-decoration-color', safeColor(computed.textDecorationColor, '#172019'), 'important')
            if (computed.boxShadow.includes('oklch')) style.setProperty('box-shadow', 'none', 'important')
          })
        },
        scale: 2,
        useCORS: true,
      })
      const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png'

      if (saveHandle) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error('이미지를 파일로 변환하지 못했습니다.')), mimeType, 0.92)
        })
        const writable = await saveHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const link = document.createElement('a')
        link.download = `${baseFileName}.${exportFormat}`
        link.href = canvas.toDataURL(mimeType, 0.92)
        document.body.appendChild(link)
        link.click()
        link.remove()
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

  const backgroundOverlay = Math.min(0.86, Math.max(0, (selectedPlan?.backgroundFade ?? 62) / 100))
  const actionButtonClass = "landi-action-button inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 font-semibold shadow-sm transition"
  const darkModeToggle = <button type="button" onClick={() => setIsDarkMode((value) => !value)} className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} aria-label="다크모드 전환">{isDarkMode ? <Sun size={17} /> : <Moon size={17} />}{isDarkMode ? '라이트' : '다크'}</button>

  if (mode === 'list') {
    return <main data-theme={isDarkMode ? "dark" : "light"} className="landi-app min-h-screen bg-[#eceee8] px-5 py-6 text-slate-900 md:px-8"><header className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-md bg-[#4f8738] text-white shadow-sm"><Trees size={24} /></div><div><h1 className="text-2xl font-semibold tracking-normal">Landi</h1><p className="text-sm text-slate-500">조감도 목록</p></div></div><div className="flex flex-wrap gap-2">{darkModeToggle}<button type="button" onClick={createNewPlan} className="landi-action-button inline-flex items-center justify-center gap-2 rounded-md bg-[#4f8738] px-4 py-2.5 text-center text-white shadow-sm hover:bg-[#3f6f2d]"><Plus size={18} />새 조감도 생성</button></div></header><section className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <article key={plan.id} className="landi-plan-card rounded-md border border-slate-200 bg-white p-4 shadow-sm"><PlanThumbnail plan={plan} /><div className="mt-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{plan.title}</h2><p className="text-sm text-slate-500">식재 {plan.plants.length}개 · {new Date(plan.updatedAt).toLocaleDateString()}</p></div><button type="button" onClick={() => deletePlan(plan.id)} className="grid h-9 w-9 place-items-center rounded-md text-red-600 hover:bg-red-50" aria-label="조감도 삭제"><Trash2 size={18} /></button></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => openPreview(plan.id)} className="landi-action-button flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-center text-slate-700 hover:bg-slate-50"><Eye size={17} />미리보기</button><button type="button" onClick={() => openEditor(plan.id)} className="landi-action-button flex w-full items-center justify-center gap-2 rounded-md bg-[#4f8738] px-4 py-2 text-center text-white shadow-sm hover:bg-[#3f6f2d]"><Pencil size={17} />편집보드</button></div></article>)}</section></main>
  }

  if (mode === 'preview' && selectedPlan) {
    return <main data-theme={isDarkMode ? "dark" : "light"} className="landi-app min-h-screen bg-[#eceee8] p-5 text-slate-900 md:p-8"><header className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center justify-between gap-3"><div><button type="button" onClick={() => setMode('list')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={17} />목록으로</button><h1 className="text-2xl font-semibold">{selectedPlan.title}</h1><p className="text-sm text-slate-500">식재 {selectedPlan.plants.length}개 · 미리보기</p></div><div className="flex flex-wrap gap-2">{darkModeToggle}<button type="button" onClick={() => openEditor(selectedPlan.id)} className="inline-flex items-center gap-2 rounded-md bg-[#4f8738] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3f6f2d]"><Pencil size={18} />편집보드로</button><button type="button" onClick={() => deletePlan(selectedPlan.id)} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={18} />삭제</button></div></header><section className="mx-auto max-w-6xl overflow-auto rounded-md bg-white p-4 shadow-[0_24px_70px_rgba(47,55,43,0.14)]"><StaticPlanBoard plan={selectedPlan} /></section></main>
  }

  if (!selectedPlan) return null

  return (
    <main data-theme={isDarkMode ? "dark" : "light"} className="landi-app flex h-screen min-h-0 flex-col overflow-hidden bg-[#eceee8] text-slate-900 lg:flex-row">
      <aside className="flex max-h-[38vh] min-h-0 w-full shrink-0 flex-col border-b border-slate-200 bg-[#fbfbf8] lg:h-screen lg:max-h-none lg:w-[260px] lg:border-b-0 lg:border-r xl:w-[286px]">
        <div className="flex h-[74px] shrink-0 items-center border-b border-slate-200 px-5 md:px-6"><div className="flex w-full items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-md bg-[#4f8738] text-white shadow-sm"><Trees size={22} /></div><div><h1 className="text-xl font-semibold tracking-normal">Landi</h1><p className="text-sm text-slate-500">편집보드</p></div></div><button type="button" onClick={() => setMode('list')} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="목록으로"><ArrowLeft size={18} /></button></div></div>
        <section className="flex min-h-0 flex-1 flex-col px-4 py-3 lg:overflow-hidden"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-normal text-slate-500">식재 팔레트</h2><Sprout size={18} className="text-[#4f8738]" /></div><div className="mb-3 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><button type="button" onClick={() => setIsPaletteFormOpen((open) => !open)} className="flex h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm font-semibold text-slate-700"><span>{editingTemplateId ? "식재 타입 수정" : "식재 타입 등록"}</span><span className="rounded-sm bg-[#edf6e7] px-2 py-1 text-[11px] font-semibold text-[#4f8738]">{isPaletteFormOpen ? "닫기" : "열기"}</span></button>{isPaletteFormOpen && <div className="grid gap-2 border-t border-slate-100 p-3"><select value={newPlantKind} onChange={(event) => setNewPlantKind(event.target.value as PlantKind)} className="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-[#4f8738]">{kindOptions.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}</select><input value={newPlantName} onChange={(event) => { setNewPlantName(event.target.value); if (paletteFormError) setPaletteFormError("") }} placeholder="식재명 예: 라벤더" aria-invalid={Boolean(paletteFormError)} className={`h-9 w-full min-w-0 rounded-md border px-2.5 text-sm outline-none placeholder:text-xs placeholder:text-slate-400 focus:border-[#4f8738] ${paletteFormError ? "border-red-400 bg-red-50" : "border-slate-300"}`} />{paletteFormError && <p className="text-xs font-semibold text-red-600" role="alert">{paletteFormError}</p>}{newPlantKind === 'flower' && <div className="rounded-md border border-slate-200 bg-[#fbfbf8] p-2"><div className="mb-2 text-xs font-semibold text-slate-500">꽃 색상</div><div className="grid grid-cols-6 gap-1.5">{flowerColorOptions.map((color) => <button key={color.value} type="button" onClick={() => setNewFlowerColor(color.value)} title={color.name} className={`h-7 rounded-md border shadow-sm ${newFlowerColor === color.value ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`} style={{ backgroundColor: color.value }} aria-label={`${color.name} 꽃 색상 선택`} />)}</div></div>}<input value={newPlantLabel} onChange={(event) => { setNewPlantLabel(event.target.value); if (paletteFormError) setPaletteFormError("") }} placeholder="학명/메모 선택" className="h-9 w-full min-w-0 rounded-md border border-slate-300 px-2.5 text-sm outline-none placeholder:text-xs placeholder:text-slate-400 focus:border-[#4f8738]" /><button type="button" onClick={addTemplateToPalette} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#4f8738] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f6f2d]"><Plus size={16} />{editingTemplateId ? "팔레트 수정" : "팔레트 등록"}</button>{editingTemplateId && <button type="button" onClick={resetPaletteForm} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">수정 취소</button>}</div>}</div><div className="min-h-0 flex-1 overflow-y-auto pr-1">
  {kindOptions.map((group) => {
    const groupTemplates = selectedPlan.palette.filter((template) => template.category === group.category)

    return (
      <section key={group.category} className="mb-4 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.colors.primary }} />
            <h3 className="text-xs font-bold text-slate-600">{group.label}</h3>
          </div>
          <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{groupTemplates.length}</span>
        </div>

        {groupTemplates.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white/70 px-3 py-4 text-center text-xs text-slate-400">
            등록된 {group.label} 식재가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5 lg:block lg:space-y-1.5">
            {groupTemplates.map((template) => (
              <div key={template.id} className="rounded-md border border-slate-200 bg-white p-1.5 shadow-sm transition hover:border-[#8fb36c] hover:bg-[#f1f7eb]">
                <button
                  type="button"
                  draggable
                  onClick={() => addPlant(template)}
                  onDragStart={(event) => event.dataTransfer.setData('template-id', template.id)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center">
                    <PlantSymbol plant={{ ...template, size: 32 }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{template.name}</div>
                    <div className="botanical-name truncate text-xs text-slate-500">{template.label}</div>
                  </div>
                </button>
                <div className="mt-1 flex justify-end gap-1 border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      startEditTemplate(template)
                    }}
                    className="grid h-6 w-6 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
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
                    className="grid h-6 w-6 place-items-center rounded-md text-red-600 hover:bg-red-50"
                    aria-label={`${template.name} 팔레트 삭제`}
                  >
                    <Trash2 size={13} />
                  </button>
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
        <header className="flex h-[74px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#fbfbf8] px-4 py-3 md:px-6"><label className="group flex min-w-[240px] flex-1 cursor-text items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition hover:border-[#9fbd86] hover:bg-white/70 focus-within:border-[#4f8738] focus-within:bg-white focus-within:shadow-sm"><span className="sr-only">조감도 제목</span><input value={selectedPlan.title} onChange={(event) => updateSelectedPlan({ title: event.target.value })} className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-normal outline-none" aria-label="조감도 제목" /><Pencil size={16} className="shrink-0 text-slate-400 transition group-hover:text-[#4f8738]" aria-hidden="true" /></label><div className="flex flex-wrap items-center gap-2">{darkModeToggle}<button type="button" onClick={exportPlanImage} disabled={isExporting} className={`${actionButtonClass} bg-[#4f8738] text-white hover:bg-[#3f6f2d] disabled:cursor-wait disabled:opacity-70`}><Download size={17} />{isExporting ? "내보내는 중" : "이미지 내보내기"}</button><label className={`${actionButtonClass} cursor-pointer bg-[#4f8738] text-white hover:bg-[#3f6f2d]`}><ImagePlus size={17} />도면 업로드<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" /></label></div></header>
        {exportError && <div className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{exportError}</div>}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-0 md:p-2 lg:p-2"><div className="mx-auto w-[1120px] max-w-none rounded-md bg-white p-1.5 shadow-[0_18px_48px_rgba(47,55,43,0.12)] md:p-2 lg:max-w-full"><div ref={canvasRef} data-export-board="true" onClick={() => setSelectedPlantId(null)} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="relative h-[640px] w-full overflow-visible border border-[#d8ded4] bg-[#f7f7f2]" style={{ backgroundImage: selectedPlan.backgroundUrl ? `linear-gradient(rgba(255,255,255,${backgroundOverlay}), rgba(255,255,255,${backgroundOverlay})), url(${selectedPlan.backgroundUrl})` : undefined, backgroundPosition: 'center', backgroundSize: selectedPlan.backgroundUrl ? 'contain' : undefined, backgroundRepeat: selectedPlan.backgroundUrl ? 'no-repeat' : undefined }}>{!selectedPlan.backgroundUrl && <PlanBase fade={selectedPlan.backgroundFade ?? 62} />}{!selectedPlan.backgroundUrl && selectedPlan.plants.length === 0 && <div className="pointer-events-none absolute left-1/2 top-[52%] -translate-x-1/2 rounded-md border border-dashed px-5 py-4 text-center shadow-sm backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderColor: 'rgba(148, 163, 184, 0.6)' }}><Layers className="mx-auto mb-2 text-[#4f8738]" size={26} /><p className="font-semibold" style={{ color: '#1e293b' }}>팔레트에서 식물을 얹어보세요</p><p className="mt-1 text-sm" style={{ color: '#64748b' }}>등록한 식재를 탭하거나 드래그해서 배치할 수 있습니다.</p></div>}{selectedPlan.plants.map((plant) => <PlacedPlant key={plant.instanceId} plant={plant} selected={selectedPlantId === plant.instanceId} plantIntensity={selectedPlan.plantIntensity ?? 125} onSelect={() => setSelectedPlantId(plant.instanceId)} onMove={(updates) => updatePlant(plant.instanceId, updates)} onResize={(updates) => updatePlant(plant.instanceId, updates)} />)}</div></div></div>
      </section>

      <aside className="flex max-h-[34vh] min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-[#fbfbf8] lg:h-screen lg:max-h-none lg:w-[260px] lg:border-l lg:border-t-0 xl:w-[286px]">
        <div className="border-b border-slate-200 px-5 py-4 md:px-6 md:py-5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><MousePointer2 size={17} />선택 도구</div><div className="mt-4 rounded-md bg-white p-4 shadow-sm ring-1 ring-slate-200">{selectedPlant ? <><div className="flex items-center justify-between"><div><p className="font-semibold text-slate-900">{selectedPlant.name}</p><p className="botanical-name text-xs text-slate-500">{selectedPlant.label}</p><p className="text-sm text-slate-500">{selectedPlant.category}</p></div><button type="button" onClick={deleteSelectedPlant} className="grid h-9 w-9 place-items-center rounded-md text-red-600 transition hover:bg-red-50" aria-label="선택 식물 삭제"><Trash2 size={18} /></button></div><div className="mt-4 flex items-center gap-2"><button type="button" onClick={() => updatePlant(selectedPlant.instanceId, { size: Math.max(28, selectedPlant.size - 8) })} className="grid h-9 w-9 place-items-center rounded-md bg-white text-slate-700 shadow-sm ring-1 ring-slate-200" aria-label="선택 식물 축소"><Minus size={18} /></button><div className="flex-1 rounded-md bg-[#f3f5ef] px-3 py-2 text-center text-sm font-semibold text-slate-600 ring-1 ring-slate-200">{Math.round(selectedPlant.size)}px</div><button type="button" onClick={() => updatePlant(selectedPlant.instanceId, { size: Math.min(180, selectedPlant.size + 8) })} className="grid h-9 w-9 place-items-center rounded-md bg-white text-slate-700 shadow-sm ring-1 ring-slate-200" aria-label="선택 식물 확대"><Plus size={18} /></button></div></> : <p className="text-sm leading-6 text-slate-500">배치된 식물을 선택하면 삭제 도구와 모서리 크기 조절 핸들이 표시됩니다.</p>}</div></div>
        <section className="border-b border-slate-200 px-4 py-3 md:px-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-600">표현 설정</h2><span className="text-[11px] font-semibold text-[#4f8738]">View</span></div><div className="grid gap-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200"><label className="grid gap-1.5 text-xs font-semibold text-slate-500"><span className="flex items-center justify-between"><span>도면 밝기</span><span>{selectedPlan.backgroundFade ?? 62}%</span></span><input type="range" min="0" max="86" value={selectedPlan.backgroundFade ?? 62} onChange={(event) => updateSelectedPlan({ backgroundFade: Number(event.target.value) })} className="landi-range" /></label><label className="grid gap-1.5 text-xs font-semibold text-slate-500"><span className="flex items-center justify-between"><span>식재 진하기</span><span>{selectedPlan.plantIntensity ?? 125}%</span></span><input type="range" min="70" max="155" value={selectedPlan.plantIntensity ?? 125} onChange={(event) => updateSelectedPlan({ plantIntensity: Number(event.target.value) })} className="landi-range" /></label></div></section>
        <section className="flex min-h-0 flex-1 flex-col px-5 py-4 md:px-6 md:py-5"><div className="mb-4 flex shrink-0 items-end justify-between"><div><h2 className="text-lg font-semibold tracking-normal">수량 집계</h2><p className="text-sm text-slate-500">Plant schedule</p></div><span className="rounded-md bg-[#edf6e7] px-2.5 py-1 text-sm font-semibold text-[#4f8738]">총 {selectedPlan.plants.length}</span></div><div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-5 lg:block lg:space-y-2">{inventory.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.colors.primary }} /><div><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className="botanical-name text-xs text-slate-500">{item.label}</p></div></div><span className="text-lg font-semibold text-slate-900">{item.count}</span></div>)}</div></section>
      </aside>
    </main>
  )
}

export default App





























































