import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forum_notices')
    .select('id, title, content, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(5)
  return Response.json({ notices: data || [] })
}
