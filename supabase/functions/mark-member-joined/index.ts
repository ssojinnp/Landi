import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-landi-auth, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type JoinRequest = {
  planIds?: string[]
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

  const token = authorization.replace('Bearer ', '')
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  const userEmail = userData.user?.email?.toLowerCase()
  if (userError || !userData.user?.id || !userEmail) return jsonResponse({ error: '인증된 사용자만 참여 상태를 기록할 수 있습니다.' }, 401)

  const payload = await request.json() as JoinRequest
  const planIds = Array.from(new Set((payload.planIds ?? []).map((id) => id.trim()).filter(Boolean)))
  if (planIds.length === 0) return jsonResponse({ joined: [] })

  const { data: plans, error: planError } = await adminClient
    .from('plans')
    .select('id,data,owner_id,owner_email,access_emails,members')
    .in('id', planIds)

  if (planError) return jsonResponse({ error: '공유 조감도를 확인하지 못했습니다.' }, 500)

  const joined: string[] = []
  const joinedAt = new Date().toISOString()

  for (const plan of plans ?? []) {
    if (String(plan.owner_email).toLowerCase() === userEmail) continue

    const accessEmails = Array.isArray(plan.access_emails) ? plan.access_emails.map((email) => String(email).toLowerCase()) : []
    const currentMembers = Array.isArray(plan.members) ? plan.members : []
    const targetMember = currentMembers.find((member) => String(member.email).toLowerCase() === userEmail)

    if (!accessEmails.includes(userEmail) || !targetMember || targetMember.status === 'joined') continue

    const nextMembers = currentMembers.map((member) =>
      String(member.email).toLowerCase() === userEmail
        ? { ...member, status: 'joined', joinedAt: member.joinedAt ?? joinedAt }
        : member
    )
    const nextData = {
      ...(typeof plan.data === 'object' && plan.data ? plan.data : {}),
      members: nextMembers,
    }

    const { error: updateError } = await adminClient
      .from('plans')
      .update({ members: nextMembers, data: nextData, updated_at: new Date().toISOString() })
      .eq('id', plan.id)

    if (!updateError) joined.push(plan.id)
  }

  return jsonResponse({ joined })
})
