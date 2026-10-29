import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from('forum_notices').select('*').order('created_at', { ascending: false })
  return Response.json({ notices: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()
  if (body.action === 'create') {
    const { data } = await supabase.from('forum_notices').insert({ title: body.title, content: body.content, active: true }).select().single()
    return Response.json({ notice: data })
  }
  if (body.action === 'toggle') {
    await supabase.from('forum_notices').update({ active: body.active }).eq('id', body.id)
    return Response.json({ ok: true })
  }
  if (body.action === 'delete') {
    await supabase.from('forum_notices').delete().eq('id', body.id)
    return Response.json({ ok: true })
  }
  return Response.json({ error: 'unknown action' }, { status: 400 })
}
