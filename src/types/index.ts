// Landi 전역 도메인 타입과 화면 상태 타입을 정의한다.
export type PlantKind = 'evergreen' | 'deciduous' | 'shrub' | 'groundcover' | 'flower'
export type PlantType = 'tree' | 'shrub' | 'flower' | 'grass'
export type ViewMode = 'list' | 'preview' | 'edit'
export type PlanRole = 'owner' | 'editor' | 'viewer'

export type PlantColors = {
  primary: string
  secondary: string
  accent: string
  stroke: string
}

export interface PlantTemplate {
  id: string
  kind: PlantKind
  category: string
  name: string
  label: string
  size: number
  colors: PlantColors
}

export interface Plant extends PlantTemplate {
  instanceId: string
  templateId: string
  x: number
  y: number
}

export interface PlanMember {
  id: string
  email: string
  role: Exclude<PlanRole, 'owner'>
  invitedAt: string
  invitedBy: string
}

export interface Plan {
  id: string
  title: string
  updatedAt: string
  backgroundUrl: string | null
  palette: PlantTemplate[]
  plants: Plant[]
  backgroundFade?: number
  plantIntensity?: number
  ownerId?: string
  ownerEmail?: string
  accessEmails?: string[]
  members?: PlanMember[]
}

export interface PlantKindOption {
  kind: PlantKind
  label: string
  category: string
  size: number
  colors: PlantColors
}

