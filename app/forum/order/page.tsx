"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function OrderPage() {
  const [menu, setMenu] = useState<string[]>([])
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selected, setSelected] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('forum_settings').select('key,value').then(({ data }) => {
      const s: Record<string, string> = {}
      for (const r of data || []) s[r.key] = r.value
      if (s.meal_menu) {
        try { setMenu(JSON.parse(s.meal_menu)) } catch { setMenu([]) }
      }
      const active = s.meal_order_active === 'true'
      const now = Date.now()
      const start = s.meal_order_start ? new Date(s.meal_order_start).getTime() : 0
      const end = s.meal_order_end ? new Date(s.meal_order_end).getTime() : Infinity
      setWindowOpen(active && now >= start && now <= end)
    })
    // pre-fill from localStorage
    try {
      const saved = localStorage.getItem('forum_name')
      if (saved) setName(saved)
      const savedPhone = localStorage.getItem('forum_phone')
      if (savedPhone) setPhone(savedPhone)
    } catch { /* ignore */ }
  }, [])

  async function submit() {
    if (!name.trim()) { setError('이름을 입력해주세요'); return }
    if (!selected) { setError('메뉴를 선택해주세요'); return }
    setSubmitting(true); setError('')
    try {
      localStorage.setItem('forum_name', name)
      if (phone) localStorage.setItem('forum_phone', phone)
    } catch { /* ignore */ }
    const r = await fetch('/api/meal-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), menu_item: selected })
    })
    setSubmitting(false)
    if (r.ok) { setDone(true) }
    else { const d = await r.json(); setError(d.error || '오류가 발생했습니다') }
  }

  if (windowOpen === null) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0830' }}>
      <p className="text-white/40">불러오는 중...</p>
    </div>
  }

  if (!windowOpen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0f0830' }}>
        <p className="text-6xl mb-4">🍽️</p>
        <p className="font-black text-xl" style={{ color: '#a78bfa' }}>주문 시간이 종료되었습니다</p>
        <p className="text-white/40 text-sm mt-2">주문이 마감되었거나 아직 시작 전입니다.</p>
        <button onClick={() => window.location.href = '/forum/home'} className="mt-8 px-6 py-3 rounded-2xl font-bold text-white" style={{ background: 'rgba(124,92,252,0.3)' }}>홈으로</button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0f0830' }}>
        <p className="text-6xl mb-4">🎉</p>
        <p className="font-black text-2xl mb-2" style={{ color: '#a78bfa' }}>주문 완료!</p>
        <p className="text-white/70 text-sm">{name}님 — {selected}</p>
        <button onClick={() => window.location.href = '/forum/home'} className="mt-8 px-8 py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c5cfc,#4dd9ff)' }}>홈으로</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-sm mx-auto" style={{ background: '#0f0830' }}>
      <p className="font-black text-2xl mb-1" style={{ color: '#a78bfa' }}>🍽️ 저녁 식사 주문</p>
      <p className="text-white/40 text-sm mb-6">2026 교육간사 포럼</p>

      <div className="space-y-4">
        <div>
          <label className="text-white/50 text-xs mb-1.5 block">이름 *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
            className="w-full rounded-xl px-4 py-3 text-white outline-none text-base"
            style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }} />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-1.5 block">연락처 (선택)</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" type="tel"
            className="w-full rounded-xl px-4 py-3 text-white outline-none text-base"
            style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }} />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-1.5 block">메뉴 선택 *</label>
          <div className="space-y-2">
            {menu.map(item => (
              <button key={item} type="button" onClick={() => setSelected(item)}
                className="w-full py-4 rounded-xl font-bold text-left px-4 transition-all"
                style={{ background: selected === item ? '#7c5cfc' : '#1a0f3a', color: selected === item ? 'white' : 'rgba(255,255,255,0.6)', border: `1px solid ${selected === item ? '#7c5cfc' : 'rgba(124,92,252,0.2)'}` }}>
                {item}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button onClick={submit} disabled={submitting}
          className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7c5cfc,#4dd9ff)' }}>
          {submitting ? '주문 중...' : '주문하기 →'}
        </button>
      </div>
    </div>
  )
}
