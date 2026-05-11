import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent, RefObject } from 'react'
import { clampPlantSize } from '../lib/canvasHelpers'
import { createTemplate } from '../lib/planHelpers'
import type { Plan, Plant, PlantKind, PlantTemplate } from '../types'

type PlantCategory = '나무' | '풀' | '꽃'

type UsePlanEditorActionsOptions = {
  selectedPlan?: Plan
  selectedPlant?: Plant
  selectedPlantId: string | null
  selectedPlantIds: string[]
  canEditSelectedPlan: boolean
  canPlacePlants: boolean
  boardScale: number
  canvasRef: RefObject<HTMLDivElement | null>
  editingTemplateId: string | null
  newPlantKind: PlantKind
  newPlantName: string
  newPlantLabel: string
  newFlowerColor: string
  flowerColorFallback: string
  setEditingTemplateId: (value: string | null) => void
  setNewPlantKind: (value: PlantKind) => void
  setNewPlantName: (value: string) => void
  setNewPlantLabel: (value: string) => void
  setNewFlowerColor: (value: string) => void
  setPaletteFormError: (value: string) => void
  setSelectedPlantId: (value: string | null) => void
  setSelectedPlantIds: Dispatch<SetStateAction<string[]>>
  setVisiblePlantCategories: Dispatch<SetStateAction<Record<PlantCategory, boolean>>>
  setIsClearPlantsConfirmOpen: (value: boolean) => void
  recordPlanSnapshot: () => void
  updateSelectedPlan: (updates: Partial<Plan>) => void
  updatePlants: (updater: (plants: Plant[]) => Plant[], options?: { recordHistory?: boolean }) => void
}

export function usePlanEditorActions({
  selectedPlan,
  selectedPlant,
  selectedPlantId,
  selectedPlantIds,
  canEditSelectedPlan,
  canPlacePlants,
  boardScale,
  canvasRef,
  editingTemplateId,
  newPlantKind,
  newPlantName,
  newPlantLabel,
  newFlowerColor,
  flowerColorFallback,
  setEditingTemplateId,
  setNewPlantKind,
  setNewPlantName,
  setNewPlantLabel,
  setNewFlowerColor,
  setPaletteFormError,
  setSelectedPlantId,
  setSelectedPlantIds,
  setVisiblePlantCategories,
  setIsClearPlantsConfirmOpen,
  recordPlanSnapshot,
  updateSelectedPlan,
  updatePlants,
}: UsePlanEditorActionsOptions) {
  const resetPaletteForm = useCallback(() => {
    setEditingTemplateId(null)
    setNewPlantKind('deciduous')
    setNewPlantName('')
    setNewPlantLabel('')
    setNewFlowerColor(flowerColorFallback)
  }, [flowerColorFallback, setEditingTemplateId, setNewFlowerColor, setNewPlantKind, setNewPlantLabel, setNewPlantName])

  const startEditTemplate = useCallback((template: PlantTemplate) => {
    if (!canEditSelectedPlan) return
    setEditingTemplateId(template.id)
    setNewPlantKind(template.kind)
    setNewPlantName(template.name)
    setNewPlantLabel(template.label)
    setNewFlowerColor(template.colors.accent)
    setPaletteFormError('')
  }, [canEditSelectedPlan, setEditingTemplateId, setNewFlowerColor, setNewPlantKind, setNewPlantLabel, setNewPlantName, setPaletteFormError])

  const validatePaletteForm = useCallback(() => {
    if (!selectedPlan || !canEditSelectedPlan) return '조감도를 먼저 선택해주세요.'
    const name = newPlantName.trim()
    if (!name) return '식재명을 입력해주세요.'
    const duplicateName = selectedPlan.palette.some((template) => template.id !== editingTemplateId && template.name.trim().toLocaleLowerCase('ko-KR') === name.toLocaleLowerCase('ko-KR'))
    if (duplicateName) return '이미 등록된 식재명입니다.'
    if (newPlantLabel.trim().length > 80) return '학명/메모는 80자 이하로 입력해주세요.'
    return ''
  }, [canEditSelectedPlan, editingTemplateId, newPlantLabel, newPlantName, selectedPlan])

  const addTemplateToPalette = useCallback(() => {
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
  }, [canEditSelectedPlan, editingTemplateId, newFlowerColor, newPlantKind, newPlantLabel, newPlantName, resetPaletteForm, selectedPlan, setPaletteFormError, updateSelectedPlan, validatePaletteForm])

  const handlePaletteFormKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    addTemplateToPalette()
  }, [addTemplateToPalette])

  const deleteTemplateFromPalette = useCallback((templateId: string) => {
    if (!selectedPlan || !canEditSelectedPlan) return
    updateSelectedPlan({
      palette: selectedPlan.palette.filter((template) => template.id !== templateId),
      plants: selectedPlan.plants.filter((plant) => plant.templateId !== templateId),
    })
    if (editingTemplateId === templateId) resetPaletteForm()
    if (selectedPlant?.templateId === templateId) {
      setSelectedPlantId(null)
      setSelectedPlantIds([])
    }
  }, [canEditSelectedPlan, editingTemplateId, resetPaletteForm, selectedPlan, selectedPlant?.templateId, setSelectedPlantId, setSelectedPlantIds, updateSelectedPlan])

  const addPlant = useCallback((template: PlantTemplate, x = 520, y = 330) => {
    if (!canPlacePlants) return
    const instanceId = `${template.id}-${crypto.randomUUID()}`
    const size = clampPlantSize(template.size)
    setVisiblePlantCategories((current) => ({ ...current, [template.category as PlantCategory]: true }))
    updatePlants((current) => [...current, { ...template, instanceId, templateId: template.id, size, x: x - size / 2, y: y - size / 2 }])
    setSelectedPlantId(instanceId)
    setSelectedPlantIds([instanceId])
  }, [canPlacePlants, setSelectedPlantId, setSelectedPlantIds, setVisiblePlantCategories, updatePlants])

  const updatePlant = useCallback((instanceId: string, updates: Partial<Plant>, options: { recordHistory?: boolean } = {}) => {
    if (!canEditSelectedPlan) return
    updatePlants((current) => {
      const target = current.find((plant) => plant.instanceId === instanceId)
      if (!target) return current
      if (selectedPlantIds.length > 1 && selectedPlantIds.includes(instanceId) && (updates.x !== undefined || updates.y !== undefined)) {
        const deltaX = updates.x === undefined ? 0 : updates.x - target.x
        const deltaY = updates.y === undefined ? 0 : updates.y - target.y
        const selectedSet = new Set(selectedPlantIds)
        return current.map((plant) => selectedSet.has(plant.instanceId) ? { ...plant, x: plant.x + deltaX, y: plant.y + deltaY } : plant)
      }
      return current.map((plant) => plant.instanceId === instanceId ? { ...plant, ...updates, ...(updates.size === undefined ? {} : { size: clampPlantSize(updates.size) }) } : plant)
    }, options)
  }, [canEditSelectedPlan, selectedPlantIds, updatePlants])

  const deleteSelectedPlant = useCallback(() => {
    if (!selectedPlantId || !canEditSelectedPlan) return
    const selectedSet = new Set(selectedPlantIds.length > 0 ? selectedPlantIds : [selectedPlantId])
    updatePlants((current) => current.filter((plant) => !selectedSet.has(plant.instanceId)))
    setSelectedPlantId(null)
    setSelectedPlantIds([])
  }, [canEditSelectedPlan, selectedPlantId, selectedPlantIds, setSelectedPlantId, setSelectedPlantIds, updatePlants])

  const clearPlacedPlants = useCallback(() => {
    if (!selectedPlan || !canEditSelectedPlan || selectedPlan.plants.length === 0) return
    updateSelectedPlan({ plants: [] })
    setSelectedPlantId(null)
    setSelectedPlantIds([])
    setIsClearPlantsConfirmOpen(false)
  }, [canEditSelectedPlan, selectedPlan, setIsClearPlantsConfirmOpen, setSelectedPlantId, setSelectedPlantIds, updateSelectedPlan])

  const handleUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !canEditSelectedPlan) return
    const reader = new FileReader()
    reader.onload = () => updateSelectedPlan({ backgroundUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }, [canEditSelectedPlan, updateSelectedPlan])

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!selectedPlan || !canPlacePlants) return
    const template = selectedPlan.palette.find((item) => item.id === event.dataTransfer.getData('template-id'))
    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    if (template && canvasBounds) addPlant(template, (event.clientX - canvasBounds.left) / boardScale, (event.clientY - canvasBounds.top) / boardScale)
  }, [addPlant, boardScale, canPlacePlants, canvasRef, selectedPlan])

  return {
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
    recordPlanSnapshot,
  }
}
