import { createClient } from '@/lib/supabase/client'

export async function GET() {
  const supabase = createClient()
  const { data } = await supabase.from('meal_orders').select('*').order('created_at', { ascending: true })
  return Response.json({ orders: data || [] })
}

export async function POST(request: Request) {
  const { name, phone, menu_item } = await request.json()
  if (!name || !menu_item) return Response.json({ error: 'Missing fields' }, { status: 400 })

  // Check order window
  const supabase = createClient()
  const { data: settings } = await supabase.from('forum_settings').select('key,value')
  const map: Record<string, string> = {}
  for (const r of settings || []) map[r.key] = r.value
  if (map['meal_order_active'] !== 'true') return Response.json({ error: 'Order window closed' }, { status: 403 })
  const now = Date.now()
  const start = map['meal_order_start'] ? new Date(map['meal_order_start']).getTime() : 0
  const end = map['meal_order_end'] ? new Date(map['meal_order_end']).getTime() : Infinity
  if (now < start || now > end) return Response.json({ error: 'Order window closed' }, { status: 403 })

  const { error } = await supabase.from('meal_orders').insert({ name, phone, menu_item })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
