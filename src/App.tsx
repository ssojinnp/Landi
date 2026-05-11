
import { useMemo, useRef, useState } from 'react'
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
import { BOARD_WIDTH, STORAGE_KEY, flowerColorOptions } from './data/plants'
import { usePlanEditorActions } from './hooks/usePlanEditorActions'
import { useEditorLayout } from './hooks/useEditorLayout'
import { usePlanAccessActions } from './hooks/usePlanAccessActions'
import { usePlanExport } from './hooks/usePlanExport'
import { usePlanPersistence, type PlanSaveStatus } from './hooks/usePlanPersistence'
import { usePlanNavigationActions } from './hooks/usePlanNavigationActions'
import { useSelectedPlanState } from './hooks/useSelectedPlanState'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { createDemoPlans } from './lib/demoPlans'
import { getEditorMetadata, getMemberInitial, getMemberRoleLabel, getMemberStatusLabel, getPlanRoleLabel, getPlanUpdatedLabel, getTreeScaleLabel, groupTreeScaleItems, isTreeKind, loadPlans } from './lib/planHelpers'
import { getPlanRole, isSupabaseConfigured, normalizePlanForUser } from './lib/supabase'
import type { Plan, Plant, PlantKind, PlanRole, ViewMode } from './types'

type InspectorPanel = 'share' | 'board' | 'schedule'
type PlantCategory = '나무' | '풀' | '꽃'
const plantCategories: PlantCategory[] = ['나무', '풀', '꽃']
const defaultVisiblePlantCategories: Record<PlantCategory, boolean> = { '나무': true, '풀': true, '꽃': true }

function getSaveStatusLabel(status: PlanSaveStatus) {
  if (status === 'saving') return '저장 중'
  if (status === 'error') return '저장 실패'
  return '저장됨'
}

function getSaveStatusClass(status: PlanSaveStatus) {
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
  const [authError, setAuthError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<PlanRole, 'owner'>>('viewer')
  const [inviteError, setInviteError] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<PlanSaveStatus>('saved')
  const [visiblePlantCategories, setVisiblePlantCategories] = useState<Record<PlantCategory, boolean>>(defaultVisiblePlantCategories)
  const boardFrameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLDivElement>(null)
  const { authUser, authReady, signInWithGoogle, signOut } = useSupabaseAuth({ setAuthError })
  const { isSharedPlansLoading } = usePlanPersistence({
    plans,
    authUser,
    storageKey: STORAGE_KEY,
    setPlans,
    setSelectedPlanId,
    setAuthError,
    setSaveStatus,
  })

  const {
    selectedPlan,
    selectedPlant,
    representativeLabelIds,
    selectedPlanRole,
    canEditSelectedPlan,
    canManageSelectedPlan,
    canOpenSelectedPlanEditor,
    hasPlanBackground,
    canPlacePlants,
    canUseBoardControls,
    groupedInventory,
    backgroundFade,
    backgroundOverlay,
    backgroundSaturation,
    plantIntensity,
    showPlantLabels,
    visiblePlants,
    ownerLabel,
    roleLabel,
    selectedPlanUpdatedLabel,
  } = useSelectedPlanState({
    plans,
    selectedPlanId,
    selectedPlantId,
    authUser,
    visiblePlantCategories,
  })
  const isPaletteFormVisible = canEditSelectedPlan && isPaletteFormOpen

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

  const { exportPlanImage } = usePlanExport({
    selectedPlan,
    mode,
    isExporting,
    canvasRef,
    previewCanvasRef,
    setExportError,
    setIsExporting,
  })

  const actionButtonClass = "landi-action-button inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 font-semibold shadow-sm transition"
  const leftPanelClass = `landi-editor-panel ${isPaletteCollapsed ? 'is-collapsed' : ''} relative flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-slate-200 bg-[var(--landi-panel)] transition-[width] duration-200 lg:h-screen lg:max-h-none lg:border-b-0 lg:border-r ${isPaletteCollapsed ? 'lg:w-14 xl:w-14' : 'lg:w-[260px] xl:w-[286px]'}`
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









