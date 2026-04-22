
import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent } from 'react'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'
import { ArrowLeft, ChevronDown, ChevronUp, ClipboardList, Download, Eye, ImagePlus, Layers, LogIn, LogOut, Minus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pencil, Plus, SlidersHorizontal, Sprout, Trash2, Trees, UserRound, Users } from 'lucide-react'
import { PlanBase } from './components/canvas/PlanBase'
import { PlantSymbol } from './components/canvas/PlantSymbol'
import { BOARD_HEIGHT, BOARD_WIDTH, defaultPalette, flowerColorOptions, kindOptions, plantToneOptions, STORAGE_KEY } from './data/plants'
import { getPlanRole, getSessionUser, isSupabaseConfigured, normalizePlanForUser, planToSharedRow, sharedRowToPlan, supabase, type LandiUser, type SharedPlanRow } from './lib/supabase'
import type { Plan, Plant, PlantKind, PlantTemplate, PlanMember, PlanRole, ViewMode } from './types'

function createPlan(title = '새 조감도', user?: LandiUser | null): Plan {
  const plan: Plan = { id: `plan-${crypto.randomUUID()}`, title, updatedAt: new Date().toISOString(), ...getEditorMetadata(user), backgroundUrl: null, palette: defaultPalette, plants: [], backgroundFade: 62, backgroundSaturation: 100, plantIntensity: 100, showPlantLabels: false }
  return user ? normalizePlanForUser(plan, user) : plan
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
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
    return parsed
  } catch {
    return []
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
type InspectorPanel = 'share' | 'view' | 'schedule'
type SaveStatus = 'saved' | 'saving' | 'error'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  if (status === 'saving') return 'text-amber-700'
  if (status === 'error') return 'text-red-600'
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
    <Draggable nodeRef={nodeRef} position={{ x: plant.x, y: plant.y }} bounds="parent" cancel=".resize-handle" disabled={readOnly} scale={boardScale} onStop={(_: DraggableEvent, data: DraggableData) => onMove({ x: data.x, y: data.y })}>
      <div ref={nodeRef} onClick={(event) => { event.stopPropagation(); onSelect() }} className={`group absolute touch-none select-none ${readOnly ? 'cursor-default' : 'cursor-move'}`} style={{ width: plant.size + 56, height: plant.size + 54, filter: 'drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))' }}>
        <div className={`absolute left-4 top-3 ${selected ? 'rounded-md outline outline-1 outline-offset-1' : ''}`} style={{ opacity: selected ? Math.min(0.92, symbolOpacity) : symbolOpacity, filter: symbolFilter, outlineColor: selected ? '#2563eb' : undefined }}>
          <PlantSymbol plant={plant} />
        </div>
        {showLabel && <div className="pointer-events-none absolute left-1/2 top-[calc(100%-10px)] h-[18px] max-w-[96px] -translate-x-1/2 overflow-hidden truncate whitespace-nowrap rounded-sm px-2 text-center text-[10px] font-semibold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)', border: '1px solid rgba(15, 23, 42, 0.10)', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.16)', color: '#334155', lineHeight: '18px' }}><span className="landi-plant-label-text">{plant.name}</span></div>}
        {!showLabel && <div className="export-hidden pointer-events-none absolute left-1/2 top-[calc(100%-10px)] h-[18px] max-w-[96px] -translate-x-1/2 overflow-hidden truncate whitespace-nowrap rounded-sm px-2 text-center text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(15, 23, 42, 0.10)', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.16)', color: '#ffffff', lineHeight: '18px' }}><span className="landi-plant-label-text">{plant.name}</span></div>}
        {selected && !readOnly && handles.map((anchor) => <ResizeHandle key={anchor} anchor={anchor} onResizeStart={startResize} />)}
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
    <div ref={frameRef} className="relative aspect-[1120/640] overflow-hidden rounded-md border border-[#d8ded4] bg-[#f7f7f2]">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `scale(${scale})` }}>
        <StaticPlanBoard plan={plan} />
      </div>
    </div>
  )
}
function StaticPlanBoard({ plan }: { plan: Plan }) {
  const backgroundFade = clampPercent(plan.backgroundFade ?? 62)
  const backgroundSaturation = clampPercent(plan.backgroundSaturation ?? 100)
  const plantIntensity = clampPercent(plan.plantIntensity ?? 100)
  const showPlantLabels = plan.showPlantLabels ?? false
  const overlay = backgroundFade / 100
  const symbolOpacity = Math.max(0.25, plantIntensity / 100)
  const symbolFilter = `saturate(${80 + plantIntensity * 0.45}%) contrast(${90 + plantIntensity * 0.2}%)`

  return (
    <div className="relative h-[640px] w-[1120px] overflow-visible border border-[#d8ded4] bg-[#f7f7f2]">
      {plan.backgroundUrl ? (
        <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,${overlay}), rgba(255,255,255,${overlay})), url(${plan.backgroundUrl})`, filter: `saturate(${backgroundSaturation}%)` }} />
      ) : (
        <PlanBase fade={backgroundFade} />
      )}
      {plan.plants.map((plant) => (
        <div key={plant.instanceId} className="absolute touch-none select-none" style={{ left: plant.x, top: plant.y, width: plant.size + 56, height: plant.size + 54, filter: 'drop-shadow(0 24px 20px rgba(12, 26, 12, 0.42)) drop-shadow(8px 12px 10px rgba(42, 54, 36, 0.28))' }}>
          <div className="absolute left-4 top-3" style={{ opacity: symbolOpacity, filter: symbolFilter }}>
            <PlantSymbol plant={plant} />
          </div>
          {showPlantLabels && <div className="absolute left-1/2 top-[calc(100%-10px)] h-[18px] max-w-[96px] -translate-x-1/2 overflow-hidden truncate whitespace-nowrap rounded-sm px-2 text-center text-[10px] font-semibold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)', border: '1px solid rgba(15, 23, 42, 0.10)', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.16)', color: '#334155', lineHeight: '18px' }}><span className="landi-plant-label-text">{plant.name}</span></div>}
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
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1280)
  const [activeToolPanel, setActiveToolPanel] = useState<InspectorPanel | null>(null)
  const [paletteFormError, setPaletteFormError] = useState('')
  const [exportError, setExportError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [authUser, setAuthUser] = useState<LandiUser | null>(null)
  const [authError, setAuthError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<PlanRole, 'owner'>>('viewer')
  const [inviteError, setInviteError] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [boardScale, setBoardScale] = useState(1)
  const [viewport, setViewport] = useState(() => ({ width: typeof window === 'undefined' ? 1440 : window.innerWidth, height: typeof window === 'undefined' ? 900 : window.innerHeight }))
  const [allowPortraitEditing, setAllowPortraitEditing] = useState(false)
  const boardFrameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const applyingRemotePlansRef = useRef(false)
  const saveSequenceRef = useRef(0)
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0]
  const selectedPlant = selectedPlan?.plants.find((plant) => plant.instanceId === selectedPlantId)
  const selectedPlanRole = selectedPlan ? getPlanRole(selectedPlan, authUser) : 'viewer'
  const canEditSelectedPlan = selectedPlanRole === 'owner' || selectedPlanRole === 'editor'
  const canManageSelectedPlan = selectedPlanRole === 'owner' && Boolean(authUser)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setAuthUser(getSessionUser(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_, session) => setAuthUser(getSessionUser(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const supabaseClient = supabase
    if (!supabaseClient || !authUser?.email) return
    let active = true

    const loadSharedPlans = async () => {
      const { data, error } = await supabaseClient
        .from('plans')
        .select('*')
        .contains('access_emails', [authUser.email.toLowerCase()])
        .order('updated_at', { ascending: false })

      if (!active) return
      if (error) {
        setAuthError(`공유 조감도를 불러오지 못했습니다. ${error.message}`)
        return
      }
      if (data) {
        applyingRemotePlansRef.current = true
        const sharedRows = data as SharedPlanRow[]
        const joinedPlanIds: string[] = []
        const joinedAt = new Date().toISOString()
        const sharedPlans = sharedRows.map((row) => {
          const plan = sharedRowToPlan(row)
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
    }

    void loadSharedPlans()
    const channel = supabaseClient.channel('landi-plans-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => void loadSharedPlans()).subscribe()
    return () => {
      active = false
      void supabaseClient.removeChannel(channel)
    }
  }, [authUser])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
    if (applyingRemotePlansRef.current) {
      applyingRemotePlansRef.current = false
      return
    }
    if (!supabase || !authUser) {
      return
    }

    const ownerPlans = plans.filter((plan) => getPlanRole(plan, authUser) === 'owner')
    const editorPlans = plans.filter((plan) => getPlanRole(plan, authUser) === 'editor')
    if (ownerPlans.length === 0 && editorPlans.length === 0) {
      return
    }

    void (async () => {
      const saveSequence = saveSequenceRef.current + 1
      saveSequenceRef.current = saveSequence
      if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
      saveStatusTimerRef.current = window.setTimeout(() => {
        if (saveSequenceRef.current === saveSequence) setSaveStatus('saving')
      }, 700)
      const ownerRows = ownerPlans.map((plan) => planToSharedRow(plan, authUser))
      if (ownerRows.length > 0) {
        const { error } = await supabase
          .from('plans')
          .upsert(ownerRows, { onConflict: 'id' })
        if (error) {
          if (saveSequenceRef.current === saveSequence) {
            if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
            saveStatusTimerRef.current = null
            setSaveStatus('error')
          }
          setAuthError(`공유 조감도를 저장하지 못했습니다. ${error.message}`)
          return
        }
      }

      for (const plan of editorPlans) {
        const row = planToSharedRow(plan, authUser)
        const { error } = await supabase
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
          }
          setAuthError(`공유 조감도를 저장하지 못했습니다. ${error.message}`)
          return
        }
      }
      if (saveSequenceRef.current === saveSequence) {
        if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current)
        saveStatusTimerRef.current = null
        setSaveStatus('saved')
      }
    })()
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

    const updateScale = () => setBoardScale(Math.min(1, frame.clientWidth / BOARD_WIDTH))
    updateScale()

    const observer = new ResizeObserver(updateScale)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [mode])

  useEffect(() => () => {
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
    if (!canEditSelectedPlan) return
    const instanceId = `${template.id}-${crypto.randomUUID()}`
    updatePlants((current) => [...current, { ...template, instanceId, templateId: template.id, x: x - template.size / 2, y: y - template.size / 2 }])
    setSelectedPlantId(instanceId)
  }
  const updatePlant = (instanceId: string, updates: Partial<Plant>) => canEditSelectedPlan && updatePlants((current) => current.map((plant) => plant.instanceId === instanceId ? { ...plant, ...updates } : plant))
  const deleteSelectedPlant = () => { if (selectedPlantId && canEditSelectedPlan) { updatePlants((current) => current.filter((plant) => plant.instanceId !== selectedPlantId)); setSelectedPlantId(null) } }
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !canEditSelectedPlan) return
    const reader = new FileReader()
    reader.onload = () => updateSelectedPlan({ backgroundUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!selectedPlan || !canEditSelectedPlan) return
    const template = selectedPlan.palette.find((item) => item.id === event.dataTransfer.getData('template-id'))
    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    if (template && canvasBounds) addPlant(template, (event.clientX - canvasBounds.left) / boardScale, (event.clientY - canvasBounds.top) / boardScale)
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
          excludeAcceptAllOption: true,
        })

        const selectedFormat = getExportFormatFromFileName(saveHandle.name)
        if (!selectedFormat) throw new Error('이미지는 PNG 또는 JPG 형식으로만 저장할 수 있습니다.')
        exportFormat = selectedFormat
      }

      exportNode.classList.add('landi-exporting')
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const canvas = await html2canvas(exportNode, {
        backgroundColor: exportFormat === 'jpg' ? '#ffffff' : '#f7f7f2',
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
  const isMobileViewport = viewport.width < 768
  const isTabletPortrait = viewport.width >= 768 && viewport.width < 1280 && viewport.height > viewport.width
  const shouldShowOrientationLock = mode === 'edit' && selectedPlan && (isMobileViewport || (isTabletPortrait && !allowPortraitEditing))
  const actionButtonClass = "landi-action-button inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 font-semibold shadow-sm transition"
  const leftPanelClass = `landi-editor-panel ${isPaletteCollapsed ? 'is-collapsed' : ''} relative flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-slate-200 bg-[#fbfbf8] transition-[width] duration-200 lg:h-screen lg:max-h-none lg:border-b-0 lg:border-r ${isPaletteCollapsed ? 'lg:w-14 xl:w-14' : 'lg:w-[260px] xl:w-[286px]'}`
  const roleLabel = selectedPlanRole === 'owner' ? '소유자' : selectedPlanRole === 'editor' ? '수정가능' : '읽기전용'
  const ownerLabel = selectedPlan?.ownerEmail ?? authUser?.email ?? '로컬 조감도'
  const selectedPlanUpdatedLabel = selectedPlan ? getPlanUpdatedLabel(selectedPlan) : ''
  const saveStatusLabel = getSaveStatusLabel(saveStatus)
  const saveStatusClass = getSaveStatusClass(saveStatus)
  const toolPanelLabel = activeToolPanel === 'share' ? '공유' : activeToolPanel === 'view' ? '표현 설정' : activeToolPanel === 'schedule' ? '수량 집계' : ''
  const toolRailButtonClass = (panel: InspectorPanel) => `grid h-10 w-10 place-items-center rounded-md border text-sm transition ${activeToolPanel === panel ? 'border-[#9fbd86] bg-[#edf6e7] text-[#4f8738] shadow-sm' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700'}`
  const toggleToolPanel = (panel: InspectorPanel) => setActiveToolPanel((current) => current === panel ? null : panel)
  const toggleRightPanel = () => setActiveToolPanel((current) => current ? null : 'share')
  const selectedPlantToolbarStyle = selectedPlant ? { left: Math.min(BOARD_WIDTH - 148, Math.max(8, selectedPlant.x + selectedPlant.size / 2 - 42)), top: Math.max(8, selectedPlant.y - 44) } : undefined
  const authControls = authUser ? <div className="flex h-10 items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="hidden min-w-0 max-w-[190px] items-center gap-2 px-3 text-sm font-semibold text-slate-700 md:flex" title={authUser.email}><UserRound size={16} className="shrink-0 text-[#4f8738]" /><span className="truncate">{authUser.name}</span>{mode === 'edit' && <span className="shrink-0 text-xs font-semibold text-slate-400">{roleLabel}</span>}</div><button type="button" onClick={signOut} title="로그아웃" className="grid h-10 w-10 place-items-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="로그아웃"><LogOut size={17} /></button></div> : <button type="button" onClick={signInWithGoogle} className={`${actionButtonClass} border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50`}><LogIn size={17} />Google 로그인</button>

  if (mode === 'list') {
    return <main data-theme="light" className="landi-app min-h-screen bg-[#eceee8] px-5 py-6 text-slate-900 md:px-8"><header className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-md bg-[#4f8738] text-white shadow-sm"><Trees size={24} /></div><div><h1 className="text-2xl font-semibold tracking-normal">Landi</h1><p className="text-sm text-slate-500">조감도 목록</p></div></div><div className="flex flex-wrap items-center gap-2">{authControls}{plans.length > 0 && <button type="button" onClick={createNewPlan} className={`${actionButtonClass} bg-[#4f8738] text-white hover:bg-[#3f6f2d]`}><Plus size={17} />새 조감도 생성</button>}</div></header>{authError && <div className="mx-auto mb-4 max-w-6xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{authError}</div>}{!isSupabaseConfigured && <div className="mx-auto mb-4 max-w-6xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Supabase 환경 변수를 설정하면 Google 로그인과 멤버 초대가 활성화됩니다.</div>}<section className={`mx-auto grid max-w-6xl gap-5 ${plans.length === 0 ? "min-h-[52vh] content-center pt-8 md:pt-12" : "md:grid-cols-2 xl:grid-cols-3"}`}>{plans.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 bg-white/80 px-5 py-14 text-center shadow-sm md:col-span-2 xl:col-span-3"><div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[#edf6e7] text-[#4f8738]"><Layers size={24} /></div><h2 className="mt-4 text-lg font-semibold text-slate-900">등록된 조감도가 없습니다</h2><p className="mx-auto mt-2 max-w-[360px] text-sm leading-6 text-slate-500">새 조감도를 생성한 뒤 도면을 업로드하고 식재 팔레트를 구성해보세요.</p><button type="button" onClick={createNewPlan} className={`${actionButtonClass} mx-auto mt-5 bg-[#4f8738] text-white hover:bg-[#3f6f2d]`}><Plus size={17} />새 조감도 생성</button></div> : plans.map((plan) => { const cardRole = getPlanRole(plan, authUser); const canOpenEditor = cardRole === 'owner' || cardRole === 'editor'; return <article key={plan.id} className="landi-plan-card rounded-md border border-slate-200 bg-white p-4 shadow-sm"><PlanThumbnail plan={plan} /><div className="mt-4 flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-1.5 flex items-center gap-2"><h2 className="truncate text-lg font-semibold">{plan.title}</h2><span className={`shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-semibold ${cardRole === 'viewer' ? 'bg-slate-100 text-slate-500' : 'bg-[#edf6e7] text-[#4f8738]'}`}>{getPlanRoleLabel(cardRole)}</span></div><p className="text-sm text-slate-500">식재 {plan.plants.length}개 · {getPlanUpdatedLabel(plan)}</p></div>{cardRole === 'owner' && <button type="button" onClick={() => deletePlan(plan.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-red-600 hover:bg-red-50" aria-label="조감도 삭제"><Trash2 size={18} /></button>}</div><div className={`mt-4 grid gap-2 ${canOpenEditor ? 'grid-cols-2' : 'grid-cols-1'}`}><button type="button" onClick={() => openPreview(plan.id)} className={`${actionButtonClass} w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}><Eye size={17} />미리보기</button>{canOpenEditor && <button type="button" onClick={() => openEditor(plan.id)} className={`${actionButtonClass} w-full bg-[#4f8738] text-white hover:bg-[#3f6f2d]`}><Pencil size={17} />편집보드</button>}</div></article> })}</section></main>
  }

  if (mode === 'preview' && selectedPlan) {
    return <main data-theme="light" className="landi-app min-h-screen bg-[#eceee8] p-5 text-slate-900 md:p-8"><header className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center justify-between gap-3"><div className="min-w-0"><button type="button" onClick={() => setMode('list')} className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"><ArrowLeft size={16} />목록으로</button><div className="grid gap-0.5"><h1 className="truncate text-[22px] font-semibold leading-7 tracking-normal text-slate-900">{selectedPlan.title}</h1><p className="text-[13px] font-medium leading-5 text-slate-500">식재 {selectedPlan.plants.length}개 · {selectedPlanUpdatedLabel}</p></div></div><div className="flex flex-wrap items-center gap-2">{authControls}<button type="button" onClick={() => openEditor(selectedPlan.id)} className={`${actionButtonClass} bg-[#4f8738] text-white hover:bg-[#3f6f2d]`}><Pencil size={17} />편집보드로</button><button type="button" onClick={() => deletePlan(selectedPlan.id)} className={`${actionButtonClass} border border-red-200 bg-white text-red-600 hover:bg-red-50`}><Trash2 size={17} />삭제</button></div></header>{authError && <div className="mx-auto mb-4 max-w-6xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{authError}</div>}<section className="mx-auto max-w-6xl overflow-auto rounded-md bg-white p-4 shadow-[0_24px_70px_rgba(47,55,43,0.14)]"><StaticPlanBoard plan={selectedPlan} /></section></main>
  }

  if (!selectedPlan) return null

  return (
    <main data-theme="light" className="landi-app flex min-h-screen flex-col overflow-y-auto bg-[#eceee8] text-slate-900 lg:h-screen lg:min-h-0 lg:overflow-hidden lg:flex-row">
      <aside className={leftPanelClass}>
        <div className={`flex shrink-0 border-b border-slate-200 ${isPaletteCollapsed ? 'h-12 items-center justify-between px-2 lg:h-auto lg:flex-col lg:items-center lg:justify-start lg:border-b-0 lg:px-2 lg:py-3' : 'h-16 items-center px-4 md:px-5'}`}><div className={`flex min-w-0 items-center ${isPaletteCollapsed ? 'gap-2 lg:flex-col' : 'gap-2.5'}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#4f8738] text-white shadow-sm" title="Landi"><Trees size={20} /></div><div className={isPaletteCollapsed ? 'hidden' : ''}><h1 className="text-lg font-semibold tracking-normal">Landi</h1><p className="text-[13px] text-slate-500">편집보드</p></div></div>{isPaletteCollapsed && <span className="mx-1 h-6 w-px bg-slate-200 lg:mx-0 lg:my-3 lg:h-px lg:w-8" aria-hidden="true" />}<div className={`flex items-center gap-1.5 ${isPaletteCollapsed ? 'lg:flex-col' : 'ml-auto'}`}><button type="button" onClick={() => setMode('list')} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="목록으로" title="목록으로"><ArrowLeft size={17} /></button><button type="button" onClick={() => setIsPaletteCollapsed((collapsed) => !collapsed)} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={isPaletteCollapsed ? '식재 팔레트 펼치기' : '식재 팔레트 접기'} title={isPaletteCollapsed ? '식재 팔레트 펼치기' : '식재 팔레트 접기'}>{isPaletteCollapsed ? <><ChevronDown size={17} className="lg:hidden" /><PanelLeftOpen size={17} className="hidden lg:block" /></> : <><ChevronUp size={17} className="lg:hidden" /><PanelLeftClose size={17} className="hidden lg:block" /></>}</button></div></div>
        <section className={`flex min-h-0 flex-1 flex-col px-4 py-3 lg:overflow-hidden ${isPaletteCollapsed ? 'hidden' : ''}`}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">식재 팔레트</h2><Sprout size={17} className="text-[#4f8738]" /></div><div className="mb-3 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><button type="button" onClick={() => canEditSelectedPlan && setIsPaletteFormOpen((open) => !open)} disabled={!canEditSelectedPlan} className="landi-form-trigger flex h-10 w-full items-center justify-between gap-3 px-3 text-left text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"><span>{editingTemplateId ? "식재 타입 수정" : "식재 타입 등록"}</span><span className="rounded-sm bg-[#edf6e7] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#4f8738]">{isPaletteFormOpen ? "닫기" : "열기"}</span></button>{isPaletteFormOpen && <div className="grid gap-2 border-t border-slate-100 p-3"><select value={newPlantKind} onChange={(event) => setNewPlantKind(event.target.value as PlantKind)} className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 outline-none focus:border-[#4f8738]">{kindOptions.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}</select><input value={newPlantName} onChange={(event) => { setNewPlantName(event.target.value); if (paletteFormError) setPaletteFormError("") }} placeholder="식재명 예: 라벤더" aria-invalid={Boolean(paletteFormError)} className={`landi-form-control h-9 w-full min-w-0 rounded-md border px-2.5 outline-none focus:border-[#4f8738] ${paletteFormError ? "border-red-400 bg-red-50" : "border-slate-300"}`} />{paletteFormError && <p className="text-xs font-semibold text-red-600" role="alert">{paletteFormError}</p>}{newPlantKind === 'flower' && <div className="rounded-md border border-slate-200 bg-[#fbfbf8] p-2"><div className="mb-2 text-xs font-semibold text-slate-500">꽃 색상</div><div className="grid grid-cols-6 gap-1.5">{flowerColorOptions.map((color) => <button key={color.value} type="button" onClick={() => setNewFlowerColor(color.value)} title={color.name} className={`h-7 rounded-md border shadow-sm ${newFlowerColor === color.value ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`} style={{ backgroundColor: color.value }} aria-label={`${color.name} 꽃 색상 선택`} />)}</div></div>}<input value={newPlantLabel} onChange={(event) => { setNewPlantLabel(event.target.value); if (paletteFormError) setPaletteFormError("") }} placeholder="학명/메모 선택" className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 px-2.5 outline-none focus:border-[#4f8738]" /><button type="button" onClick={addTemplateToPalette} className="landi-form-control inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#4f8738] px-3 text-white shadow-sm transition hover:bg-[#3f6f2d]"><Plus size={16} />{editingTemplateId ? "팔레트 수정" : "팔레트 등록"}</button>{editingTemplateId && <button type="button" onClick={resetPaletteForm} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition hover:bg-slate-50">수정 취소</button>}</div>}</div><div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
          <div className="grid gap-1.5 md:grid-cols-2 lg:block lg:space-y-1.5">
            {groupTemplates.map((template) => (
              <div key={template.id} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border border-transparent bg-white/80 px-2 py-1.5 transition hover:border-[#9fbd86] hover:bg-white hover:shadow-sm">
                <button
                  type="button"
                  draggable
                  onClick={() => addPlant(template)}
                  onDragStart={(event) => event.dataTransfer.setData('template-id', template.id)}
                  className="flex min-w-0 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden">
                    <PlantSymbol plant={{ ...template, size: 24 }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold leading-5 text-slate-800">{template.name}</div>
                    <div className="botanical-name truncate text-xs leading-4 text-slate-500">{template.label}</div>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      startEditTemplate(template)
                    }}
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
                    className="grid h-7 w-7 place-items-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700"
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
        <header className="flex h-[64px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#fbfbf8] px-4 py-3 md:px-6"><div className="flex min-w-[240px] flex-1 items-center gap-2 overflow-hidden"><label className="group flex h-9 min-w-[180px] max-w-[620px] flex-[1_1_620px] cursor-text items-center gap-2 rounded-md border border-transparent px-2 transition hover:border-[#9fbd86] hover:bg-white/60 focus-within:border-[#4f8738] focus-within:bg-white/80 focus-within:shadow-sm"><span className="sr-only">조감도 제목</span><input value={selectedPlan.title} onChange={(event) => updateSelectedPlan({ title: event.target.value })} disabled={!canEditSelectedPlan} className="landi-title-input min-w-[120px] w-full bg-transparent text-[19px] leading-6 tracking-normal text-slate-900 outline-none disabled:cursor-not-allowed" aria-label="조감도 제목" /><Pencil size={16} className="shrink-0 text-slate-400 transition group-hover:text-[#4f8738]" aria-hidden="true" /></label><span className="hidden max-w-[180px] shrink truncate text-[12px] font-medium leading-4 text-slate-500 xl:inline">{selectedPlanUpdatedLabel}</span>{saveStatus !== 'saved' && <span className={`hidden shrink-0 text-[12px] font-medium leading-4 xl:inline ${saveStatusClass}`} role="status">{saveStatusLabel}</span>}</div><div className="flex flex-wrap items-center gap-2">{authControls}<button type="button" onClick={exportPlanImage} disabled={isExporting} className={`${actionButtonClass} bg-[#4f8738] text-white hover:bg-[#3f6f2d] disabled:cursor-wait disabled:opacity-70`}><Download size={17} />{isExporting ? "내보내는 중" : "내보내기"}</button>{canEditSelectedPlan && <label title="도면 업로드" aria-label="도면 업로드" className="grid h-10 w-10 cursor-pointer place-items-center rounded-md bg-[#4f8738] text-white shadow-sm transition hover:bg-[#3f6f2d]"><ImagePlus size={18} /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" /></label>}</div></header>
        {authError && <div className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{authError}</div>}
        {!canEditSelectedPlan && <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">읽기전용 권한입니다. 조감도 확인과 이미지 내보내기만 사용할 수 있습니다.</div>}
        {exportError && <div className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{exportError}</div>}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-0 md:p-2 lg:p-2">
          <div className={`transition duration-200 ${shouldShowOrientationLock ? 'pointer-events-none opacity-25 blur-[1px]' : ''}`}>
            <div ref={boardFrameRef} className="mx-auto w-full max-w-[1120px] rounded-md bg-white p-1.5 shadow-[0_18px_48px_rgba(47,55,43,0.12)] md:p-2">
              <div className="relative overflow-hidden" style={{ width: BOARD_WIDTH * boardScale, maxWidth: '100%', height: BOARD_HEIGHT * boardScale }}>
                <div ref={canvasRef} data-export-board="true" onClick={() => setSelectedPlantId(null)} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="relative origin-top-left overflow-visible border border-[#d8ded4] bg-[#f7f7f2]" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `scale(${boardScale})` }}>{selectedPlan.backgroundUrl && <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,${backgroundOverlay}), rgba(255,255,255,${backgroundOverlay})), url(${selectedPlan.backgroundUrl})`, filter: `saturate(${backgroundSaturation}%)` }} />}{!selectedPlan.backgroundUrl && <PlanBase fade={clampPercent(selectedPlan.backgroundFade ?? 62)} />}{!selectedPlan.backgroundUrl && selectedPlan.plants.length === 0 && <div className="absolute left-1/2 top-1/2 z-10 w-[min(420px,calc(100%-48px))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-dashed border-slate-300 bg-white/90 px-5 py-5 text-center shadow-sm backdrop-blur-sm"><div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-[#edf6e7] text-[#4f8738]"><ImagePlus size={22} /></div><p className="mt-3 text-[15px] font-semibold text-slate-900">등록된 도면이 없습니다</p><p className="mt-1.5 text-[13px] leading-5 text-slate-500">도면 이미지를 업로드하면 이 영역을 기준으로 식재를 배치할 수 있습니다.</p>{canEditSelectedPlan ? <label className="landi-form-control mx-auto mt-4 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#4f8738] px-3 text-white shadow-sm transition hover:bg-[#3f6f2d]"><ImagePlus size={16} />도면 업로드<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" /></label> : <p className="mt-3 text-xs font-semibold text-slate-400">읽기전용 권한에서는 도면을 업로드할 수 없습니다.</p>}</div>}{selectedPlan.plants.map((plant) => <PlacedPlant key={plant.instanceId} plant={plant} selected={selectedPlantId === plant.instanceId} plantIntensity={plantIntensity} showLabel={showPlantLabels} boardScale={boardScale} readOnly={!canEditSelectedPlan} onSelect={() => setSelectedPlantId(plant.instanceId)} onMove={(updates) => updatePlant(plant.instanceId, updates)} onResize={(updates) => updatePlant(plant.instanceId, updates)} />)}{selectedPlant && canEditSelectedPlan && selectedPlantToolbarStyle && <div className="export-hidden absolute z-30 flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur" style={selectedPlantToolbarStyle} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}><button type="button" onClick={() => updatePlant(selectedPlant.instanceId, { size: Math.max(28, selectedPlant.size - 8) })} className="grid h-8 w-8 place-items-center rounded-md text-slate-700 hover:bg-slate-100" aria-label="선택 식물 축소"><Minus size={16} /></button><span className="min-w-[44px] px-1 text-center text-xs font-semibold text-slate-600">{Math.round(selectedPlant.size)}px</span><button type="button" onClick={() => updatePlant(selectedPlant.instanceId, { size: Math.min(180, selectedPlant.size + 8) })} className="grid h-8 w-8 place-items-center rounded-md text-slate-700 hover:bg-slate-100" aria-label="선택 식물 확대"><Plus size={16} /></button><span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" /><button type="button" onClick={deleteSelectedPlant} className="grid h-8 w-8 place-items-center rounded-md text-red-600 hover:bg-red-50" aria-label="선택 식물 삭제"><Trash2 size={16} /></button></div>}</div>
              </div>
            </div>
          </div>
          {shouldShowOrientationLock && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="orientation-lock-title">
              <div className="w-full max-w-[420px] rounded-md border border-white/70 bg-white px-5 py-5 text-center shadow-[0_24px_70px_rgba(15,23,42,0.35)]">
                <p id="orientation-lock-title" className="text-lg font-semibold text-slate-950">가로모드에 최적화되어 있습니다</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">태블릿을 가로로 돌리면 도면과 식재 위치를 더 넓고 정확하게 편집할 수 있습니다.</p>
                {!isMobileViewport && <button type="button" onClick={() => setAllowPortraitEditing(true)} className={`${actionButtonClass} mt-4 bg-[#4f8738] text-white hover:bg-[#3f6f2d]`}>세로에서 계속하기</button>}
              </div>
            </div>
          )}
        </div>
      </section>
      <aside className="flex max-h-[48vh] min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-[#fbfbf8] lg:h-screen lg:max-h-none lg:w-auto lg:flex-row lg:border-l lg:border-t-0">
        <nav className="flex h-12 shrink-0 items-center justify-center gap-1 border-b border-slate-200 px-2 lg:h-full lg:w-14 lg:flex-col lg:justify-start lg:border-b-0 lg:border-r lg:px-2 lg:py-3" aria-label="편집 도구">
          <button type="button" onClick={() => toggleToolPanel('share')} className={toolRailButtonClass('share')} aria-label="공유" title="공유"><Users size={18} /></button>
          <button type="button" onClick={() => toggleToolPanel('view')} className={toolRailButtonClass('view')} aria-label="표현 설정" title="표현 설정"><SlidersHorizontal size={18} /></button>
          <button type="button" onClick={() => toggleToolPanel('schedule')} className={toolRailButtonClass('schedule')} aria-label="수량 집계" title="수량 집계"><ClipboardList size={18} /></button>
          <span className="mx-1 h-6 w-px bg-slate-200 lg:mx-0 lg:my-1 lg:h-px lg:w-8" aria-hidden="true" />
          <button type="button" onClick={toggleRightPanel} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label={activeToolPanel ? '우측 패널 접기' : '우측 패널 펼치기'} title={activeToolPanel ? '우측 패널 접기' : '우측 패널 펼치기'}>{activeToolPanel ? <><ChevronUp size={17} className="lg:hidden" /><PanelRightClose size={17} className="hidden lg:block" /></> : <><ChevronDown size={17} className="lg:hidden" /><PanelRightOpen size={17} className="hidden lg:block" /></>}</button>
        </nav>
        {activeToolPanel && <section className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-5 lg:w-[286px] lg:flex-none">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-700">{toolPanelLabel}</h2></div>
          {activeToolPanel === 'share' && <div className="grid gap-3"><div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[13px] font-semibold leading-5 text-slate-800">프로젝트 공유</p><p className="mt-0.5 truncate text-xs text-slate-500" title={ownerLabel}>{ownerLabel}</p></div><span className="shrink-0 rounded-md bg-[#edf6e7] px-2 py-1 text-xs font-semibold text-[#4f8738]">{roleLabel}</span></div></div>{authUser ? <>{canManageSelectedPlan ? <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm"><input value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); if (inviteError) setInviteError(''); if (inviteStatus) setInviteStatus('') }} placeholder="이메일로 초대" className="landi-form-control h-9 w-full min-w-0 rounded-md border border-slate-300 px-2.5 outline-none focus:border-[#4f8738]" /><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Exclude<PlanRole, 'owner'>)} className="landi-form-control h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 outline-none focus:border-[#4f8738]"><option value="viewer">읽기전용</option><option value="editor">수정가능</option></select><button type="button" onClick={inviteMember} disabled={isInviting} className="landi-form-control inline-flex h-9 min-w-[54px] items-center justify-center rounded-md bg-[#4f8738] px-3 text-white shadow-sm transition hover:bg-[#3f6f2d] disabled:cursor-wait disabled:opacity-70">{isInviting ? '발송중' : '초대'}</button></div>{inviteError && <p className="text-xs font-semibold text-red-600" role="alert">{inviteError}</p>}{inviteStatus && <p className="text-xs font-semibold text-[#4f8738]" role="status">{inviteStatus}</p>}</div> : <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-500 shadow-sm">초대와 권한 변경은 소유자만 할 수 있습니다.</div>}</> : <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-500 shadow-sm">Google 로그인 후 조감도를 공유할 수 있습니다.</div>}<div className="grid gap-2"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-normal text-slate-500">멤버</h3><span className="text-xs font-semibold text-slate-400">{(selectedPlan.members ?? []).length}</span></div>{(selectedPlan.members ?? []).length > 0 ? (selectedPlan.members ?? []).map((member) => <div key={member.email} className="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#edf6e7] text-xs font-bold text-[#4f8738]" title={member.email} aria-hidden="true">{getMemberInitial(member.email)}</div><div className="min-w-0"><p className="truncate text-[11px] font-semibold leading-4 text-slate-500">{getMemberStatusLabel(member.status)}</p><p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${member.status === 'joined' ? 'bg-[#4f8738]' : 'bg-slate-300'}`} aria-hidden="true" /><span>{getMemberRoleLabel(member.role)}</span></p></div>{canManageSelectedPlan && <div className="flex shrink-0 items-center gap-1"><select value={member.role} onChange={(event) => updateMemberRole(member.email, event.target.value as Exclude<PlanRole, 'owner'>)} className="landi-compact-control h-8 w-[58px] rounded-md border border-slate-200 bg-white px-2 text-slate-600 outline-none transition focus:border-[#4f8738] focus:ring-2 focus:ring-[#4f8738]/10"><option value="viewer">읽기</option><option value="editor">수정</option></select><button type="button" onClick={() => removeMember(member.email)} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`${member.email} 초대 제거`}><Trash2 size={13} /></button></div>}<div className="pointer-events-none absolute left-3 top-[calc(100%+6px)] z-30 hidden w-max max-w-[230px] rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_14px_32px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block"><p className="truncate text-xs font-semibold text-slate-800">{member.email}</p><p className="mt-1 text-[11px] font-medium text-slate-500">{getMemberRoleLabel(member.role)} · {getMemberStatusLabel(member.status)}</p></div></div>) : <div className="rounded-md border border-dashed border-slate-200 bg-white/70 px-3 py-4 text-center text-xs text-slate-400">아직 초대된 멤버가 없습니다.</div>}</div></div>}
          {activeToolPanel === 'view' && <div className="grid gap-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200"><label className="grid gap-1.5 text-xs font-semibold text-slate-500"><span className="flex items-center justify-between"><span>도면 밝기</span><span>{backgroundFade}%</span></span><input type="range" min="0" max="100" value={backgroundFade} onChange={(event) => updateSelectedPlan({ backgroundFade: Number(event.target.value) })} className="landi-range" /></label><label className="grid gap-1.5 text-xs font-semibold text-slate-500"><span className="flex items-center justify-between"><span>도면 채도</span><span>{backgroundSaturation}%</span></span><input type="range" min="0" max="100" value={backgroundSaturation} onChange={(event) => updateSelectedPlan({ backgroundSaturation: Number(event.target.value) })} className="landi-range" /></label><label className="grid gap-1.5 text-xs font-semibold text-slate-500"><span className="flex items-center justify-between"><span>식재 진하기</span><span>{plantIntensity}%</span></span><input type="range" min="0" max="100" value={plantIntensity} onChange={(event) => updateSelectedPlan({ plantIntensity: Number(event.target.value) })} className="landi-range" /></label><label className="flex h-9 items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><span>식재명 표시</span><input type="checkbox" checked={showPlantLabels} onChange={(event) => updateSelectedPlan({ showPlantLabels: event.target.checked })} className="h-4 w-4 accent-[#4f8738]" /></label></div>}
          {activeToolPanel === 'schedule' && <div className="grid gap-3"><div className="flex items-center justify-end"><span className="rounded-md bg-[#edf6e7] px-2.5 py-1 text-xs font-semibold text-[#4f8738]">총 {selectedPlan.plants.length}</span></div><div className="grid gap-2 md:grid-cols-2 lg:block lg:space-y-2">{inventory.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 shadow-sm"><div className="flex min-w-0 items-center gap-3"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.colors.primary }} /><div className="min-w-0"><p className="truncate text-sm font-semibold leading-5 text-slate-800">{item.name}</p><p className="botanical-name truncate text-xs leading-4 text-slate-500">{item.label}</p></div></div><span className="text-lg font-semibold text-slate-900">{item.count}</span></div>)}</div></div>}
        </section>}
      </aside>
    </main>
  )
}

export default App

























