import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('forum_admin_auth')?.value === 'kccc2026'
}

export async function PATCH(request: Request) {
  if (!await checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, name, menu_item } = await request.json()
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, string> = {}
  if (name !== undefined) patch.name = name
  if (menu_item !== undefined) patch.menu_item = menu_item
  if (!Object.keys(patch).length) return Response.json({ error: 'Nothing to update' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.from('meal_orders').update(patch).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(request: Request) {
  if (!await checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.from('meal_orders').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
