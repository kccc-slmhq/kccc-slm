import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('forum_admin_auth')?.value === 'kccc2026'
}

export async function GET() {
  if (!await checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()
  const { data, error } = await supabase.from('forum_settings').select('*')
  if (error) return Response.json({ settings: {} })
  const settings: Record<string, string> = {}
  for (const row of data || []) settings[row.key] = row.value
  return Response.json({ settings })
}

export async function POST(request: Request) {
  if (!await checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, value } = await request.json()
  if (!key) return Response.json({ error: 'Missing key' }, { status: 400 })
  const supabase = await createClient()
  if (value === null || value === undefined) {
    await supabase.from('forum_settings').delete().eq('key', key)
  } else {
    await supabase.from('forum_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }
  return Response.json({ ok: true })
}
