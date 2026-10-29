import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = (searchParams.get('name') || '').trim()
  const cohort = (searchParams.get('cohort') || '').trim()

  if (!name || !cohort) return Response.json({ error: 'name and cohort required' }, { status: 400 })

  const supabase = await createClient()

  // Check rooms published
  const { data: settings } = await supabase.from('forum_settings').select('key,value')
  const map: Record<string, string> = {}
  for (const r of settings || []) map[r.key] = r.value
  if (map['rooms_published'] !== 'true') return Response.json({ error: 'not published' }, { status: 403 })

  // Find the person
  const { data: persons } = await supabase
    .from('forum_registrations')
    .select('id,name,cohort,district,room_number,attending')
    .ilike('name', name)
    .eq('cohort', cohort)
    .eq('attending', true)

  if (!persons || persons.length === 0) return Response.json({ error: 'not found' })

  // For each match, get roommates
  const results = await Promise.all(persons.map(async person => {
    if (!person.room_number) return { ...person, roommates: [] }
    const { data: roommates } = await supabase
      .from('forum_registrations')
      .select('name,cohort,district')
      .eq('room_number', person.room_number)
      .eq('attending', true)
      .neq('id', person.id)
    return { ...person, roommates: roommates || [] }
  }))

  return Response.json({ results })
}
