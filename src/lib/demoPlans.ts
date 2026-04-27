import { createPlan } from './planHelpers'
import { normalizePlanForUser, type LandiUser } from './supabase'

export function createDemoPlans(authUser: LandiUser | null) {
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
}
