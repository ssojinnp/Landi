
import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { PlanThumbnail } from './components/canvas/PlanThumbnail'
import { AuthControls } from './components/common/AuthControls'
import { CompactGuideButton, GuideButton } from './components/common/GuideButtons'
import { StaticPlanBoard } from './components/canvas/StaticPlanBoard'
import { BoardSettingsPanel } from './components/editor/BoardSettingsPanel'
import { ClearPlantsDialog } from './components/editor/ClearPlantsDialog'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { EditorHeader } from './components/editor/EditorHeader'
import { EditorSidebarHeader } from './components/editor/EditorSidebarHeader'
import { EditorStatusBanners } from './components/editor/EditorStatusBanners'
import { EditorToolPanel } from './components/editor/EditorToolPanel'
import { OrientationLockDialog } from './components/editor/OrientationLockDialog'
import { PalettePanel } from './components/editor/PalettePanel'
import { SchedulePanel } from './components/editor/SchedulePanel'
import { SharePanel } from './components/editor/SharePanel'
import { ToolRail } from './components/editor/ToolRail'
import { GuidePage } from './components/views/GuidePage'
import { ListPage } from './components/views/ListPage'
import { LoginRequiredPage } from './components/views/LoginRequiredPage'
import { LoadingScreen } from './components/views/LoadingScreen'
import { PreviewPage } from './components/views/PreviewPage'
import { BOARD_WIDTH, STORAGE_KEY, flowerColorOptions, kindOptions } from './data/plants'
import { usePlanEditorActions } from './hooks/usePlanEditorActions'
import { useEditorLayout } from './hooks/useEditorLayout'
import { usePlanAccessActions } from './hooks/usePlanAccessActions'
import { usePlanNavigationActions } from './hooks/usePlanNavigationActions'
import { clampPercent, getRepresentativeLabelIds } from './lib/canvasHelpers'
import { createDemoPlans } from './lib/demoPlans'
import { getEditorMetadata, getMemberInitial, getMemberRoleLabel, getMemberStatusLabel, getPlanRoleLabel, getPlanUpdatedLabel, getTreeScaleLabel, groupTreeScaleItems, isTreeKind, loadPlans, migratePlan } from './lib/planHelpers'
import { getPlanRole, getSessionUser, isSupabaseConfigured, normalizePlanForUser, planToSharedRow, sharedRowToPlan, supabase, type LandiUser, type SharedPlanRow } from './lib/supabase'
import type { Plan, Plant, PlantKind, PlanRole, ViewMode } from './types'

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

type InspectorPanel = 'share' | 'board' | 'schedule'
type SaveStatus = 'saved' | 'saving' | 'error'
type PlantCategory = '나무' | '풀' | '꽃'
const plantCategories: PlantCategory[] = ['나무', '풀', '꽃']
const defaultVisiblePlantCategories: Record<PlantCategory, boolean> = { '나무': true, '풀': true, '꽃': true }

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
  const { boardScale, setAllowPortraitEditing, isMobileViewport, shouldShowOrientationLock } = useEditorLayout({ mode, hasSelectedPlan: Boolean(selectedPlan), boardFrameRef })

  const inventory = useMemo(() => selectedPlan?.palette.map((template) => ({ ...template, count: selectedPlan.plants.filter((plant) => plant.templateId === template.id).length })) ?? [], [selectedPlan])
  const groupedInventory = useMemo(() => kindOptions.map((group) => {
    const items = inventory.filter((item) => item.category === group.category && item.count > 0)
    const total = items.reduce((sum, item) => sum + item.count, 0)
    return { ...group, items, total }
  }).filter((group) => group.items.length > 0), [inventory])

  const { inviteMember, updateMemberRole, removeMember } = usePlanAccessActions({
    selectedPlan,
    authUser,
    canManageSelectedPlan,
    inviteEmail,
    inviteRole,
    setInviteError,
    setInviteStatus,
    setInviteEmail,
    setIsInviting,
    updateSelectedPlan,
  })

  const {
    resetPaletteForm,
    startEditTemplate,
    addTemplateToPalette,
    handlePaletteFormKeyDown,
    deleteTemplateFromPalette,
    addPlant,
    updatePlant,
    deleteSelectedPlant,
    clearPlacedPlants,
    handleUpload,
    handleDrop,
  } = usePlanEditorActions({
    selectedPlan,
    selectedPlant,
    selectedPlantId,
    canEditSelectedPlan,
    canPlacePlants,
    boardScale,
    canvasRef,
    editingTemplateId,
    newPlantKind,
    newPlantName,
    newPlantLabel,
    newFlowerColor,
    flowerColorFallback: flowerColorOptions[0].value,
    setEditingTemplateId,
    setNewPlantKind,
    setNewPlantName,
    setNewPlantLabel,
    setNewFlowerColor,
    setPaletteFormError,
    setSelectedPlantId,
    setVisiblePlantCategories,
    setIsClearPlantsConfirmOpen,
    updateSelectedPlan,
    updatePlants,
  })

  const { createNewPlan, deletePlan, openPreview, openEditor, openGuide, closeGuide } = usePlanNavigationActions({
    plans,
    authUser,
    selectedPlanId,
    mode,
    guideReturnMode,
    setPlans,
    setSelectedPlanId,
    setSelectedPlantId,
    setMode,
    setGuideReturnMode,
    setAuthError,
  })

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
  const authControls = <AuthControls authUser={authUser} actionButtonClass={actionButtonClass} onSignIn={signInWithGoogle} onSignOut={signOut} />
  const guideButton = <GuideButton actionButtonClass={actionButtonClass} onOpenGuide={openGuide} />
  const compactGuideButton = <CompactGuideButton onOpenGuide={openGuide} />
  const editablePlanCount = plans.filter((plan) => {
    const role = getPlanRole(plan, authUser)
    return role === 'owner' || role === 'editor'
  }).length
  const sharedPlanCount = plans.filter((plan) => getPlanRole(plan, authUser) !== 'owner').length
  const planWithBoardCount = plans.filter((plan) => Boolean(plan.backgroundUrl)).length
  const demoPlans = useMemo(() => createDemoPlans(authUser), [authUser])
  const displayPlans = [...demoPlans, ...plans]

  if (isSupabaseConfigured && !authReady) return <LoadingScreen message="로그인 상태를 확인하고 있습니다." />
  if (mode === 'guide') return <GuidePage authControls={authControls} onBack={closeGuide} />

  if (isSupabaseConfigured && !authUser) return <LoginRequiredPage actionButtonClass={actionButtonClass} authError={authError} onSignIn={signInWithGoogle} onOpenGuide={openGuide} />

  if (isSupabaseConfigured && authUser && isSharedPlansLoading && mode === 'list') return <LoadingScreen message="조감도 목록을 불러오고 있습니다." />

  if (mode === 'list') {
    return <ListPage authControls={authControls} guideButton={guideButton} displayPlans={displayPlans} plansCount={plans.length} editablePlanCount={editablePlanCount} sharedPlanCount={sharedPlanCount} planWithBoardCount={planWithBoardCount} authError={authError} isSupabaseConfigured={isSupabaseConfigured} authUser={authUser} actionButtonClass={actionButtonClass} createNewPlan={createNewPlan} openPreview={openPreview} openEditor={openEditor} deletePlan={deletePlan} getPlanRoleLabel={getPlanRoleLabel} getPlanUpdatedLabel={getPlanUpdatedLabel} renderThumbnail={(plan) => <PlanThumbnail plan={plan} />} />
  }

  if (mode === 'preview' && selectedPlan) {
    return <PreviewPage selectedPlan={selectedPlan} selectedPlanRole={selectedPlanRole} selectedPlanUpdatedLabel={selectedPlanUpdatedLabel} canOpenSelectedPlanEditor={canOpenSelectedPlanEditor} authControls={authControls} compactGuideButton={compactGuideButton} authError={authError} isExporting={isExporting} actionButtonClass={actionButtonClass} onBack={() => setMode('list')} onExport={exportPlanImage} onOpenEditor={() => openEditor(selectedPlan.id)} onDelete={() => deletePlan(selectedPlan.id)} getPlanRoleLabel={getPlanRoleLabel} renderBoard={<div ref={previewCanvasRef} data-export-board="true" className="w-fit"><StaticPlanBoard plan={selectedPlan} /></div>} />
  }

  if (!selectedPlan) return null

  return (
    <main data-theme="light" className="landi-app flex min-h-screen flex-col overflow-y-auto bg-[var(--landi-bg)] text-slate-900 lg:h-screen lg:min-h-0 lg:overflow-hidden lg:flex-row">
      <aside className={leftPanelClass}>
        <EditorSidebarHeader isPaletteCollapsed={isPaletteCollapsed} onBack={() => setMode('list')} onToggleCollapse={() => setIsPaletteCollapsed((collapsed) => !collapsed)} />
        <div className={isPaletteCollapsed ? 'hidden' : ''}>
          <PalettePanel selectedPlan={selectedPlan} hasPlanBackground={hasPlanBackground} canEditSelectedPlan={canEditSelectedPlan} canPlacePlants={canPlacePlants} editingTemplateId={editingTemplateId} isPaletteFormVisible={isPaletteFormVisible} newPlantKind={newPlantKind} newPlantName={newPlantName} newPlantLabel={newPlantLabel} newFlowerColor={newFlowerColor} paletteFormError={paletteFormError} setIsPaletteFormOpen={setIsPaletteFormOpen} setNewPlantKind={setNewPlantKind} setNewPlantName={setNewPlantName} setNewPlantLabel={setNewPlantLabel} setNewFlowerColor={setNewFlowerColor} clearPaletteFormError={() => { if (paletteFormError) setPaletteFormError('') }} addTemplateToPalette={addTemplateToPalette} resetPaletteForm={resetPaletteForm} handlePaletteFormKeyDown={handlePaletteFormKeyDown} addPlant={addPlant} startEditTemplate={(template) => { startEditTemplate(template); setIsPaletteFormOpen(true) }} deleteTemplateFromPalette={deleteTemplateFromPalette} isTreeKind={isTreeKind} groupTreeScaleItems={groupTreeScaleItems} getTreeScaleLabel={getTreeScaleLabel} />
        </div>
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EditorHeader title={selectedPlan.title} canEditSelectedPlan={canEditSelectedPlan} selectedPlanUpdatedLabel={selectedPlanUpdatedLabel} saveStatus={saveStatus} saveStatusLabel={saveStatusLabel} saveStatusClass={saveStatusClass} authControls={authControls} compactGuideButton={compactGuideButton} actionButtonClass={actionButtonClass} isExporting={isExporting} onTitleChange={(title) => updateSelectedPlan({ title })} onExport={exportPlanImage} onUpload={handleUpload} />
        <EditorStatusBanners authError={authError} exportError={exportError} canEditSelectedPlan={canEditSelectedPlan} />
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-0 md:p-2 lg:p-2">
            <div className={`transition duration-200 ${shouldShowOrientationLock ? 'pointer-events-none opacity-25 blur-[1px]' : ''}`}>
              <EditorCanvas selectedPlan={selectedPlan} boardScale={boardScale} backgroundOverlay={backgroundOverlay} backgroundSaturation={backgroundSaturation} plantIntensity={plantIntensity} showPlantLabels={showPlantLabels} representativeLabelIds={representativeLabelIds} visiblePlants={visiblePlants} selectedPlantId={selectedPlantId} selectedPlant={selectedPlant} selectedPlantToolbarStyle={selectedPlantToolbarStyle} canEditSelectedPlan={canEditSelectedPlan} boardFrameRef={boardFrameRef} canvasRef={canvasRef} onSelectPlant={setSelectedPlantId} onClearSelection={() => setSelectedPlantId(null)} onUpload={handleUpload} onDrop={handleDrop} onUpdatePlant={updatePlant} onDeleteSelectedPlant={deleteSelectedPlant} />
            </div>
          <OrientationLockDialog open={shouldShowOrientationLock} isMobileViewport={isMobileViewport} actionButtonClass={actionButtonClass} onContinuePortrait={() => setAllowPortraitEditing(true)} />
        </div>
      </section>
      <aside className="flex max-h-[48vh] min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-[var(--landi-panel)] lg:h-screen lg:max-h-none lg:w-auto lg:flex-row lg:border-l lg:border-t-0">
        <ToolRail activeToolPanel={activeToolPanel} toolRailButtonClass={toolRailButtonClass} onTogglePanel={toggleToolPanel} onToggleRightPanel={toggleRightPanel} />
        <EditorToolPanel activeToolPanel={activeToolPanel} toolPanelLabel={toolPanelLabel} sharePanel={<SharePanel selectedPlan={selectedPlan} selectedPlanRole={selectedPlanRole} ownerLabel={ownerLabel} roleLabel={roleLabel} authUserEmail={authUser?.email} canManageSelectedPlan={canManageSelectedPlan} inviteEmail={inviteEmail} inviteRole={inviteRole} inviteError={inviteError} inviteStatus={inviteStatus} isInviting={isInviting} setInviteEmail={setInviteEmail} clearInviteFeedback={() => { if (inviteError) setInviteError(''); if (inviteStatus) setInviteStatus('') }} setInviteRole={setInviteRole} inviteMember={inviteMember} updateMemberRole={updateMemberRole} removeMember={removeMember} getMemberInitial={getMemberInitial} getMemberRoleLabel={getMemberRoleLabel} getMemberStatusLabel={getMemberStatusLabel} />} boardPanel={<BoardSettingsPanel canUseBoardControls={canUseBoardControls} canEditSelectedPlan={canEditSelectedPlan} hasPlanBackground={hasPlanBackground} backgroundFade={backgroundFade} backgroundSaturation={backgroundSaturation} plantIntensity={plantIntensity} showPlantLabels={showPlantLabels} plantCategories={plantCategories} visiblePlantCategories={visiblePlantCategories} selectedPlantCount={selectedPlan.plants.length} setIsClearPlantsConfirmOpen={setIsClearPlantsConfirmOpen} updateBackgroundFade={(value) => updateSelectedPlan({ backgroundFade: value })} updateBackgroundSaturation={(value) => updateSelectedPlan({ backgroundSaturation: value })} updatePlantIntensity={(value) => updateSelectedPlan({ plantIntensity: value })} toggleShowPlantLabels={() => updateSelectedPlan({ showPlantLabels: !showPlantLabels })} togglePlantCategoryVisibility={togglePlantCategoryVisibility} />} schedulePanel={<SchedulePanel totalPlants={selectedPlan.plants.length} groupedInventory={groupedInventory} groupTreeScaleItems={groupTreeScaleItems} />} />
      </aside>
      <ClearPlantsDialog open={isClearPlantsConfirmOpen} onClose={() => setIsClearPlantsConfirmOpen(false)} onConfirm={clearPlacedPlants} />
    </main>
  )
}

export default App









