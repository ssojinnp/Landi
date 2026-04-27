
import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import type { ChangeEvent, DragEvent } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, ClipboardList, Download, HelpCircle, ImagePlus, LogIn, LogOut, Minus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pencil, Plus, SlidersHorizontal, Trash2, Trees, UserRound, Users } from 'lucide-react'
import { PlacedPlant } from './components/canvas/PlacedPlant'
import { PlanThumbnail } from './components/canvas/PlanThumbnail'
import { StaticPlanBoard } from './components/canvas/StaticPlanBoard'
import { BoardSettingsPanel } from './components/editor/BoardSettingsPanel'
import { PalettePanel } from './components/editor/PalettePanel'
import { SchedulePanel } from './components/editor/SchedulePanel'
import { SharePanel } from './components/editor/SharePanel'
import { GuidePage } from './components/views/GuidePage'
import { ListPage } from './components/views/ListPage'
import { LoadingScreen } from './components/views/LoadingScreen'
import { PreviewPage } from './components/views/PreviewPage'
import { BOARD_HEIGHT, BOARD_WIDTH, STORAGE_KEY, flowerColorOptions, kindOptions } from './data/plants'
import { clampPercent, clampPlantSize, getRepresentativeLabelIds, PLANT_SIZE_MAX, PLANT_SIZE_MIN, PLANT_SIZE_STEP } from './lib/canvasHelpers'
import { EMPTY_PLAN_TITLE, createPlan, createTemplate, getEditorMetadata, getMemberInitial, getMemberRoleLabel, getMemberStatusLabel, getPlanRoleLabel, getPlanUpdatedLabel, getTreeScaleLabel, groupTreeScaleItems, isTreeKind, loadPlans, migratePlan } from './lib/planHelpers'
import { getPlanRole, getSessionUser, isSupabaseConfigured, normalizePlanForUser, planToSharedRow, sharedRowToPlan, supabase, type LandiUser, type SharedPlanRow } from './lib/supabase'
import type { Plan, Plant, PlantKind, PlantTemplate, PlanRole, ViewMode } from './types'

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
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
  const demoPlans = useMemo(() => {
    if (!authUser) return []

    const joinedAt = new Date().toISOString()
    const editorPlan = normalizePlanForUser({
      ...createPlan('수정가능 테스트 조감도', authUser),
      id: 'demo-editor-plan',
      ownerId: 'demo-owner',
      ownerEmail: 'owner@landi.test',
      members: [{ id: 'demo-editor-member', email: authUser.email, role: 'editor', status: 'joined', joinedAt, invitedAt: joinedAt, invitedBy: 'owner@landi.test' }],
      accessEmails: ['owner@landi.test', authUser.email],
    }, authUser)
    const viewerPlan = normalizePlanForUser({
      ...createPlan('읽기전용 테스트 조감도', authUser),
      id: 'demo-viewer-plan',
      ownerId: 'demo-owner',
      ownerEmail: 'owner@landi.test',
      members: [{ id: 'demo-viewer-member', email: authUser.email, role: 'viewer', status: 'joined', joinedAt, invitedAt: joinedAt, invitedBy: 'owner@landi.test' }],
      accessEmails: ['owner@landi.test', authUser.email],
    }, authUser)

    return [editorPlan, viewerPlan]
  }, [authUser])
  const displayPlans = [...demoPlans, ...plans]

  if (isSupabaseConfigured && !authReady) return <LoadingScreen message="로그인 상태를 확인하고 있습니다." />
  if (mode === 'guide') return <GuidePage authControls={authControls} onBack={closeGuide} />

  if (isSupabaseConfigured && !authUser) {
    return <main data-theme="light" className="landi-app flex min-h-screen items-center justify-center bg-[var(--landi-bg)] px-5 py-8 text-slate-900"><section className="w-full max-w-[420px] rounded-md border border-slate-200 bg-white/90 p-5 text-center shadow-[0_24px_70px_rgba(47,55,43,0.14)]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm"><Trees size={26} /></div><h1 className="mt-4 text-2xl font-semibold tracking-normal text-slate-950">Landi</h1><p className="mt-2 text-[13px] leading-5 text-slate-500">내 조감도와 공유받은 조감도를 확인하려면 로그인이 필요합니다.</p><button type="button" onClick={signInWithGoogle} className={`${actionButtonClass} mt-5 w-full bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}><LogIn size={17} />Google 로그인</button><button type="button" onClick={openGuide} className="landi-action-button mt-2 inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"><HelpCircle size={17} />시작 가이드</button>{authError && <div className="mt-3 rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-left text-xs font-semibold text-[var(--landi-danger-dark)]" role="alert">{authError}</div>}</section></main>
  }

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
        <div className={`flex shrink-0 border-b border-slate-200 ${isPaletteCollapsed ? 'h-12 items-center justify-between px-2 lg:h-auto lg:flex-col lg:items-center lg:justify-start lg:border-b-0 lg:px-2 lg:py-3' : 'h-16 items-center px-4 md:px-5'}`}><div className={`flex min-w-0 items-center ${isPaletteCollapsed ? 'gap-2 lg:flex-col' : 'gap-2.5'}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm" title="Landi"><Trees size={20} /></div><div className={isPaletteCollapsed ? 'hidden' : ''}><h1 className="text-lg font-semibold tracking-normal">Landi</h1><p className="text-[13px] text-slate-500">편집보드</p></div></div>{isPaletteCollapsed && <span className="mx-1 h-6 w-px bg-slate-200 lg:mx-0 lg:my-3 lg:h-px lg:w-8" aria-hidden="true" />}<div className={`flex items-center gap-1.5 ${isPaletteCollapsed ? 'lg:flex-col' : 'ml-auto'}`}><button type="button" onClick={() => setMode('list')} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="목록으로" title="목록으로"><ArrowLeft size={17} /></button><button type="button" onClick={() => setIsPaletteCollapsed((collapsed) => !collapsed)} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={isPaletteCollapsed ? '식재 팔레트 펼치기' : '식재 팔레트 접기'} title={isPaletteCollapsed ? '식재 팔레트 펼치기' : '식재 팔레트 접기'}>{isPaletteCollapsed ? <><ChevronDown size={17} className="lg:hidden" /><PanelLeftOpen size={17} className="hidden lg:block" /></> : <><ChevronUp size={17} className="lg:hidden" /><PanelLeftClose size={17} className="hidden lg:block" /></>}</button></div></div>
        <div className={isPaletteCollapsed ? 'hidden' : ''}>
          <PalettePanel selectedPlan={selectedPlan} hasPlanBackground={hasPlanBackground} canEditSelectedPlan={canEditSelectedPlan} canPlacePlants={canPlacePlants} editingTemplateId={editingTemplateId} isPaletteFormVisible={isPaletteFormVisible} newPlantKind={newPlantKind} newPlantName={newPlantName} newPlantLabel={newPlantLabel} newFlowerColor={newFlowerColor} paletteFormError={paletteFormError} setIsPaletteFormOpen={setIsPaletteFormOpen} setNewPlantKind={setNewPlantKind} setNewPlantName={setNewPlantName} setNewPlantLabel={setNewPlantLabel} setNewFlowerColor={setNewFlowerColor} clearPaletteFormError={() => { if (paletteFormError) setPaletteFormError('') }} addTemplateToPalette={addTemplateToPalette} resetPaletteForm={resetPaletteForm} handlePaletteFormKeyDown={handlePaletteFormKeyDown} addPlant={addPlant} startEditTemplate={startEditTemplate} deleteTemplateFromPalette={deleteTemplateFromPalette} isTreeKind={isTreeKind} groupTreeScaleItems={groupTreeScaleItems} getTreeScaleLabel={getTreeScaleLabel} />
        </div>
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
{activeToolPanel === 'share' && <SharePanel selectedPlan={selectedPlan} selectedPlanRole={selectedPlanRole} ownerLabel={ownerLabel} roleLabel={roleLabel} authUserEmail={authUser?.email} canManageSelectedPlan={canManageSelectedPlan} inviteEmail={inviteEmail} inviteRole={inviteRole} inviteError={inviteError} inviteStatus={inviteStatus} isInviting={isInviting} setInviteEmail={setInviteEmail} clearInviteFeedback={() => { if (inviteError) setInviteError(''); if (inviteStatus) setInviteStatus('') }} setInviteRole={setInviteRole} inviteMember={inviteMember} updateMemberRole={updateMemberRole} removeMember={removeMember} getMemberInitial={getMemberInitial} getMemberRoleLabel={getMemberRoleLabel} getMemberStatusLabel={getMemberStatusLabel} />}
{activeToolPanel === 'board' && <BoardSettingsPanel canUseBoardControls={canUseBoardControls} canEditSelectedPlan={canEditSelectedPlan} hasPlanBackground={hasPlanBackground} backgroundFade={backgroundFade} backgroundSaturation={backgroundSaturation} plantIntensity={plantIntensity} showPlantLabels={showPlantLabels} plantCategories={plantCategories} visiblePlantCategories={visiblePlantCategories} selectedPlantCount={selectedPlan.plants.length} setIsClearPlantsConfirmOpen={setIsClearPlantsConfirmOpen} updateBackgroundFade={(value) => updateSelectedPlan({ backgroundFade: value })} updateBackgroundSaturation={(value) => updateSelectedPlan({ backgroundSaturation: value })} updatePlantIntensity={(value) => updateSelectedPlan({ plantIntensity: value })} toggleShowPlantLabels={() => updateSelectedPlan({ showPlantLabels: !showPlantLabels })} togglePlantCategoryVisibility={togglePlantCategoryVisibility} />}
          {activeToolPanel === 'schedule' && <SchedulePanel totalPlants={selectedPlan.plants.length} groupedInventory={groupedInventory} groupTreeScaleItems={groupTreeScaleItems} />}
        </section>}
      </aside>
      {isClearPlantsConfirmOpen && <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-5 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="clear-plants-title"><div className="w-full max-w-[360px] rounded-md border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.28)]"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--landi-danger-soft)] text-[var(--landi-danger)]"><Trash2 size={19} /></div><div className="min-w-0"><h2 id="clear-plants-title" className="text-[15px] font-semibold leading-6 text-slate-950">배치된 식재를 모두 제거할까요?</h2><p className="mt-1.5 text-[13px] leading-5 text-slate-500">도면 위에 배치된 식재만 삭제됩니다. 식재 팔레트와 도면은 유지됩니다.</p></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIsClearPlantsConfirmOpen(false)} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50">취소</button><button type="button" onClick={clearPlacedPlants} className="landi-form-control inline-flex h-9 items-center justify-center rounded-md bg-[var(--landi-danger)] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[var(--landi-danger-dark)]">모두 제거</button></div></div></div>}
    </main>
  )
}

export default App









