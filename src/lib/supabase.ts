import { createClient } from '@supabase/supabase-js'
import type { Session, User } from '@supabase/supabase-js'
import type { Plan, PlanRole } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

export type LandiUser = {
  id: string
  email: string
  name: string
  avatarUrl: string
}

export type SharedPlanRow = {
  id: string
  title: string
  data: Plan
  owner_id: string
  owner_email: string
  access_emails: string[]
  members: NonNullable<Plan['members']>
  updated_at: string
}

export function mapSupabaseUser(user: User): LandiUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? '사용자',
    avatarUrl: user.user_metadata?.avatar_url ?? '',
  }
}

export function getSessionUser(session: Session | null): LandiUser | null {
  return session?.user ? mapSupabaseUser(session.user) : null
}

export function getPlanRole(plan: Plan, user: LandiUser | null): PlanRole {
  if (!plan.ownerId) return 'owner'
  if (!user?.email) return 'viewer'
  if (plan.ownerId === user.id || plan.ownerEmail?.toLowerCase() === user.email.toLowerCase()) return 'owner'
  return plan.members?.find((member) => member.email.toLowerCase() === user.email.toLowerCase())?.role ?? 'viewer'
}

export function normalizePlanForUser(plan: Plan, user: LandiUser): Plan {
  const ownerEmail = plan.ownerEmail ?? user.email
  const accessEmails = Array.from(new Set([ownerEmail, user.email, ...(plan.accessEmails ?? []), ...(plan.members ?? []).map((member) => member.email)].map((email) => email.toLowerCase()).filter(Boolean)))

  return {
    ...plan,
    ownerId: plan.ownerId ?? user.id,
    ownerEmail,
    accessEmails,
    members: plan.members ?? [],
  }
}

export function planToSharedRow(plan: Plan, user: LandiUser): SharedPlanRow {
  const normalized = normalizePlanForUser(plan, user)
  return {
    id: normalized.id,
    title: normalized.title,
    data: normalized,
    owner_id: normalized.ownerId as string,
    owner_email: normalized.ownerEmail as string,
    access_emails: normalized.accessEmails ?? [],
    members: normalized.members ?? [],
    updated_at: normalized.updatedAt,
  }
}

export function sharedRowToPlan(row: SharedPlanRow): Plan {
  return {
    ...row.data,
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    ownerId: row.owner_id,
    ownerEmail: row.owner_email,
    accessEmails: row.access_emails ?? [],
    members: row.members ?? [],
  }
}
