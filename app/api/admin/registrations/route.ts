import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('forum_admin_auth')?.value === 'kccc2026'
}

export async function GET() {
  if (!await checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('forum_registrations')
    .select('*')
    .order('registered_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ registrations: data || [] })
}

export async function PATCH(request: Request) {
  if (!await checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await request.json()
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const allowed = ['fee_paid', 'attended', 'room_number', 'key_taken']
  const patch: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in updates) patch[k] = updates[k]
  }
  if (!Object.keys(patch).length) return Response.json({ error: 'Nothing to update' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.from('forum_registrations').update(patch).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
