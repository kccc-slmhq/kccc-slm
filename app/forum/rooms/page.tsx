"use client"

import { useState } from "react"

type RoomResult = {
  name: string; cohort: string; district: string; room_number: string;
  room_key_taken: boolean;
  roommates: { name: string; cohort: string; district: string; key_taken: boolean }[]
}

export default function RoomsPage() {
  const [name, setName] = useState('')
  const [cohort, setCohort] = useState('')
  const [results, setResults] = useState<RoomResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function search() {
    if (!name.trim() || !cohort.trim()) { setError('이름과 기수를 모두 입력해주세요.'); return }
    setLoading(true); setError(''); setResults(null)
    const r = await fetch(`/api/rooms?name=${encodeURIComponent(name.trim())}&cohort=${encodeURIComponent(cohort.trim())}`)
    const data = await r.json()
    setLoading(false)
    if (r.status === 403) { setError('호실 배정이 아직 공지되지 않았습니다.'); return }
    if (data.error === 'not found') { setError('등록 정보를 찾을 수 없습니다. 이름과 기수를 확인해주세요.'); return }
    if (data.error) { setError(data.error); return }
    setResults(data.results || [])
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-sm mx-auto" style={{ background: '#0f0830' }}>
      <div className="mb-6">
        <p className="font-black text-2xl" style={{ color: '#a78bfa' }}>🛏️ 숙소 호실 확인</p>
        <p className="text-white/40 text-sm mt-1">이름과 기수로 내 호실을 확인하세요.</p>
      </div>

      <div className="space-y-3 mb-4">
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="이름"
          className="w-full px-4 py-3 rounded-2xl font-bold text-white text-base outline-none"
          style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <input
          value={cohort} onChange={e => setCohort(e.target.value)}
          placeholder="기수 (예: 30)"
          className="w-full px-4 py-3 rounded-2xl font-bold text-white text-base outline-none"
          style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button
          onClick={search} disabled={loading}
          className="w-full py-3 rounded-2xl font-black text-white text-base"
          style={{ background: 'linear-gradient(135deg,#7c5cfc,#4dd9ff)' }}
        >
          {loading ? '검색 중...' : '호실 확인'}
        </button>
      </div>

      {error && <p className="text-center text-sm mt-4" style={{ color: '#f87171' }}>{error}</p>}

      {results && results.length === 0 && (
        <p className="text-center text-white/40 text-sm mt-4">결과가 없습니다.</p>
      )}

      {results && results.map((r, i) => (
        <div key={i} className="mt-4 rounded-2xl p-5" style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.2)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: 'rgba(77,217,255,0.15)', color: '#4dd9ff' }}>
              {r.room_number ? r.room_number.split(' ').pop() : '?'}
            </div>
            <div>
              <p className="font-black text-white text-base">{r.room_number ? `${r.room_number}호` : '미배정'}</p>
              <p className="text-white/40 text-xs">{r.name} · {r.district}</p>
            </div>
          </div>
          {r.roommates.length > 0 && (
            <div className="mb-3 space-y-1">
              <p className="text-white/30 text-xs mb-1">같은 방</p>
              {r.roommates.map((m, j) => (
                <div key={j} className="flex justify-between text-sm">
                  <span className="text-white/70 font-bold">{m.name}</span>
                  <span className="text-white/30">{m.district}</span>
                </div>
              ))}
            </div>
          )}
          {r.room_number && (
            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-lg">{r.room_key_taken ? '🔑' : '🔒'}</span>
              <span className="text-sm font-bold" style={{ color: r.room_key_taken ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                {r.room_key_taken ? '키 수령 완료' : '키 미수령'}
              </span>
            </div>
          )}
        </div>
      ))}

      <button onClick={() => window.location.href = '/forum/home'} className="mt-8 w-full py-3 rounded-2xl font-bold text-white/60" style={{ background: 'rgba(255,255,255,0.06)' }}>홈으로</button>
    </div>
  )
}
