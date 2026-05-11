import { STORAGE_KEY, defaultPalette, flowerColorOptions, kindOptions, plantToneOptions } from '../data/plants'
import { normalizePlanForUser, type LandiUser } from './supabase'
import type { Plan, Plant, PlantKind, PlantTemplate, PlanMember, PlanRole } from '../types'

export const EMPTY_PLAN_TITLE = '등록된 도면이 없습니다'
const LEGACY_LIRIOPE_IDS = new Set(['liriope'])
const LEGACY_LIRIOPE_NAMES = new Set(['맥문동'])
const KOCHIA_TEMPLATE = defaultPalette.find((template) => template.id === 'kochia') ?? defaultPalette[3]
const HYDRANGEA_TEMPLATE = defaultPalette.find((template) => template.id === 'hydrangea') ?? defaultPalette[4]

function isLegacyLiriopeTemplate(template: Pick<PlantTemplate, 'id' | 'name'>) {
  return LEGACY_LIRIOPE_IDS.has(template.id) || LEGACY_LIRIOPE_NAMES.has(template.name.trim())
}

function migrateTemplate(template: PlantTemplate): PlantTemplate {
  if (template.id === HYDRANGEA_TEMPLATE.id) return { ...template, colors: HYDRANGEA_TEMPLATE.colors }
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
  if (plant.templateId === HYDRANGEA_TEMPLATE.id || plant.id === HYDRANGEA_TEMPLATE.id) return { ...plant, colors: HYDRANGEA_TEMPLATE.colors }
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

export function migratePlan(plan: Plan): Plan {
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

export function getEditorMetadata(user?: LandiUser | null) {
  return {
    lastEditedById: user?.id,
    lastEditedByEmail: user?.email,
    lastEditedByName: user?.name ?? (user?.email ? user.email.split('@')[0] : '로컬 사용자'),
  }
}

export function createPlan(title = '새 조감도', user?: LandiUser | null): Plan {
  const plan: Plan = {
    id: `plan-${crypto.randomUUID()}`,
    title,
    updatedAt: new Date().toISOString(),
    ...getEditorMetadata(user),
    backgroundUrl: null,
    palette: defaultPalette,
    plants: [],
    backgroundFade: 62,
    backgroundSaturation: 100,
    plantIntensity: 100,
    showPlantLabels: false,
  }

  return user ? normalizePlanForUser(plan, user) : plan
}

export function loadPlans(): Plan[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved) as Plan[]
    return parsed.map((plan) => migratePlan(plan))
  } catch {
    return []
  }
}

export function createTemplate(kind: PlantKind, name: string, label = '', flowerAccent = flowerColorOptions[0].value): PlantTemplate {
  const option = kindOptions.find((item) => item.kind === kind) ?? kindOptions.find((item) => item.category === '나무') ?? kindOptions[0]
  const toneSet = plantToneOptions[kind]
  const generatedTone = toneSet?.[Math.floor(Math.random() * toneSet.length)]
  const colors = kind === 'flower' ? { ...option.colors, accent: flowerAccent } : (generatedTone ?? option.colors)
  const size = kind === 'shrub' ? 58 : option.size
  return { id: `${kind}-${crypto.randomUUID()}`, kind, category: option.category, name: name.trim(), label: label.trim() || option.label, size, colors }
}

export function formatRelativeTime(isoDate?: string) {
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

export function getLastEditorLabel(plan: Plan) {
  return plan.lastEditedByName ?? plan.lastEditedByEmail?.split('@')[0] ?? plan.ownerEmail?.split('@')[0] ?? '로컬 사용자'
}

export function getPlanUpdatedLabel(plan: Plan) {
  return `${getLastEditorLabel(plan)} · ${formatRelativeTime(plan.updatedAt)}`
}

export function getMemberStatusLabel(status: PlanMember['status']) {
  return status === 'joined' ? '참여 완료' : '초대 대기'
}

export function getMemberInitial(email: string) {
  return email.trim().slice(0, 1).toUpperCase() || '?'
}

export function getMemberRoleLabel(role: Exclude<PlanRole, 'owner'>) {
  return role === 'editor' ? '수정가능' : '읽기전용'
}

export function getPlanRoleLabel(role: PlanRole) {
  return role === 'owner' ? '소유자' : role === 'editor' ? '수정가능' : '읽기전용'
}

export function getTreeScaleLabel(kind: PlantKind) {
  if (kind === 'shrub') return '관목'
  if (kind === 'evergreen' || kind === 'deciduous') return '교목'
  return null
}

export function isTreeKind(kind: PlantKind) {
  return getTreeScaleLabel(kind) !== null
}

export function groupTreeScaleItems<T extends Pick<PlantTemplate, 'kind'>>(items: T[]) {
  const canopyItems = items.filter((item) => getTreeScaleLabel(item.kind) === '교목')
  const shrubItems = items.filter((item) => getTreeScaleLabel(item.kind) === '관목')
  const otherItems = items.filter((item) => getTreeScaleLabel(item.kind) === null)

  return [
    { label: '교목', items: canopyItems },
    { label: '관목', items: shrubItems },
    { label: null, items: otherItems },
  ].filter((group) => group.items.length > 0)
}
