import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('forum_admin_auth')?.value === 'kccc2026'
}

export async function POST(request: Request) {
  if (!await checkAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = await createClient()
  const { error } = await supabase.from('forum_registrations').insert([{
    name: body.name,
    cohort: body.cohort,
    district: body.district,
    campus: body.campus || '',
    phone: body.phone || '',
    gender: body.gender,
    attendance_type: body.attendance_type,
    attending: true,
    registered_at: body.registered_at || new Date().toISOString(),
  }])
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
