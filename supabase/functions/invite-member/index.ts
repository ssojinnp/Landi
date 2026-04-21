import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-landi-auth, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type InviteRole = 'viewer' | 'editor'

type InviteRequest = {
  planId?: string
  email?: string
  role?: InviteRole
  redirectTo?: string
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase function secrets are not configured.' }, 500)
  }

  const authorization = request.headers.get('x-landi-auth') ?? request.headers.get('Authorization')
  if (!authorization) return jsonResponse({ error: 'Missing authorization token.' }, 401)

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const mailClient = createClient(supabaseUrl, supabaseAnonKey)

  const token = authorization.replace('Bearer ', '')
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  const userId = userData.user?.id
  const userEmail = userData.user?.email ?? ''
  if (userError || !userId) return jsonResponse({ error: '인증된 사용자만 초대할 수 있습니다.' }, 401)

  const payload = await request.json() as InviteRequest
  const planId = payload.planId?.trim()
  const email = payload.email?.trim().toLowerCase()
  const role = payload.role === 'editor' ? 'editor' : 'viewer'

  if (!planId || !email || !email.includes('@')) {
    return jsonResponse({ error: '초대할 조감도와 이메일을 확인해주세요.' }, 400)
  }

  const { data: plan, error: planError } = await adminClient
    .from('plans')
    .select('id,title,data,owner_id,owner_email,access_emails,members')
    .eq('id', planId)
    .single()

  if (planError || !plan) return jsonResponse({ error: '조감도를 찾지 못했습니다.' }, 404)
  if (plan.owner_id !== userId) return jsonResponse({ error: '소유자만 멤버를 초대할 수 있습니다.' }, 403)

  const invitedBy = userEmail || plan.owner_email
  const currentMembers = Array.isArray(plan.members) ? plan.members : []
  const nextMembers = [
    ...currentMembers.filter((member) => String(member.email).toLowerCase() !== email),
    { id: `member-${crypto.randomUUID()}`, email, role, invitedAt: new Date().toISOString(), invitedBy },
  ]
  const nextAccessEmails = Array.from(new Set([...(plan.access_emails ?? []), plan.owner_email, email].map((item) => String(item).toLowerCase()).filter(Boolean)))
  const nextData = {
    ...(typeof plan.data === 'object' && plan.data ? plan.data : {}),
    members: nextMembers,
    accessEmails: nextAccessEmails,
  }

  const { error: updateError } = await adminClient
    .from('plans')
    .update({ members: nextMembers, access_emails: nextAccessEmails, data: nextData, updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (updateError) return jsonResponse({ error: '초대 권한을 저장하지 못했습니다.' }, 500)

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: payload.redirectTo,
    data: { planId, planTitle: plan.title, planRole: role },
  })

  if (inviteError) {
    const normalizedMessage = inviteError.message.toLowerCase()
    const alreadyRegistered = normalizedMessage.includes('already') || normalizedMessage.includes('registered')

    if (alreadyRegistered) {
      const { error: loginLinkError } = await mailClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: payload.redirectTo, shouldCreateUser: false },
      })

      if (!loginLinkError) {
        return jsonResponse({ invited: true, emailSent: true, emailKind: 'signin' })
      }

      return jsonResponse({
        invited: true,
        emailSent: false,
        reason: 'signin_email_failed',
        detail: loginLinkError.message,
      })
    }

    return jsonResponse({
      invited: true,
      emailSent: false,
      reason: inviteError.message,
    })
  }

  return jsonResponse({ invited: true, emailSent: true, emailKind: 'invite' })
})



