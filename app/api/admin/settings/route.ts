import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/client'

function checkAuth() {
  const cookieStore = cookies()
  return cookieStore.get('forum_admin_auth')?.value === 'kccc2026'
}

export async function GET() {
  if (!checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient()
  const { data, error } = await supabase.from('forum_settings').select('*')
  if (error) return Response.json({ settings: {} })
  const settings: Record<string, string> = {}
  for (const row of data || []) settings[row.key] = row.value
  return Response.json({ settings })
}

export async function POST(request: Request) {
  if (!checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, value } = await request.json()
  if (!key) return Response.json({ error: 'Missing key' }, { status: 400 })
  const supabase = createClient()
  if (value === null || value === undefined) {
    await supabase.from('forum_settings').delete().eq('key', key)
  } else {
    await supabase.from('forum_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }
  return Response.json({ ok: true })
}
