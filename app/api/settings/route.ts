import { createClient } from '@/lib/supabase/server'

// Public endpoint — only exposes non-sensitive settings needed by the user app
const PUBLIC_KEYS = ['meal_order_active', 'meal_order_start', 'meal_order_end', 'meal_menu', 'rooms_published']

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from('forum_settings').select('key,value').in('key', PUBLIC_KEYS)
  const settings: Record<string, string> = {}
  for (const row of data || []) settings[row.key] = row.value
  return Response.json({ settings })
}
