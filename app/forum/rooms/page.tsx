"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type Reg = { name: string; district: string; room_number: string | null }

export default function RoomsPage() {
  const [published, setPublished] = useState<boolean | null>(null)
  const [regs, setRegs] = useState<Reg[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: settings } = await supabase.from('forum_settings').select('key,value').eq('key', 'rooms_published').maybeSingle()
      if (settings?.value !== 'true') { setPublished(false); return }
      setPublished(true)
      const { data } = await supabase.from('forum_registrations').select('name,district,room_number').eq('attending', true).order('room_number', { ascending: true })
      setRegs(data || [])
    }
    load()
  }, [])

  if (published === null) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0830' }}>
      <p className="text-white/40">불러오는 중...</p>
    </div>
  }

  if (!published) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0f0830' }}>
        <p className="text-6xl mb-4">🛏️</p>
        <p className="font-black text-xl" style={{ color: '#a78bfa' }}>호실 배정 준비 중</p>
        <p className="text-white/40 text-sm mt-2">호실 배정이 아직 공지되지 않았습니다.</p>
        <button onClick={() => window.history.back()} className="mt-8 px-6 py-3 rounded-2xl font-bold text-white" style={{ background: 'rgba(124,92,252,0.3)' }}>돌아가기</button>
      </div>
    )
  }

  const grouped: Record<string, Reg[]> = {}
  regs.forEach(r => {
    const room = r.room_number || '미배정'
    if (!grouped[room]) grouped[room] = []
    grouped[room].push(r)
  })

  return (
    <div className="min-h-screen px-4 py-8 max-w-sm mx-auto" style={{ background: '#0f0830' }}>
      <div className="mb-6">
        <p className="font-black text-2xl" style={{ color: '#a78bfa' }}>🛏️ 숙소 호실 배정</p>
        <p className="text-white/40 text-sm mt-1">2026 교육간사 포럼 · 수원 CCC 회관</p>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([room, list]) => (
          <div key={room} className="rounded-2xl p-4" style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.2)' }}>
            <p className="font-black text-base mb-2" style={{ color: room === '미배정' ? '#f87171' : '#4dd9ff' }}>{room}</p>
            <div className="space-y-1">
              {list.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-white text-sm font-bold">{r.name}</span>
                  <span className="text-white/40 text-xs">{r.district}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => window.location.href = '/forum/home'} className="mt-8 w-full py-3 rounded-2xl font-bold text-white/60" style={{ background: 'rgba(255,255,255,0.06)' }}>홈으로</button>
    </div>
  )
}
