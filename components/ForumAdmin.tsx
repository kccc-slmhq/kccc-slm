"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FinanceTab } from '@/components/ForumLedger'
import { RegisterModal } from '@/components/ForumHome'
import { getAuth, clearAuth, getHonorific, getDisplayGrade } from '@/lib/forum/auth'

type Row = Record<string, any>

const FULL_SPECIAL = ['나미애', '박예찬']

function calcFee(s: Row) {
  if (['선생님', '봉사자'].includes(s.grade)) return 0
  if (s.student_type === '새친구') return 0
  if (s.student_type === '헌친구') return 30000
  if (s.sibling_discount) return 40000
  return 50000
}

function feeLabel(s: Row) {
  if (['선생님', '봉사자'].includes(s.grade)) return '면제'
  if (s.student_type === '새친구') return '새친구 면제'
  if (s.student_type === '헌친구') return '30,000원'
  if (s.sibling_discount) return '40,000원 (형제할인)'
  return '50,000원'
}

const BASE_TABS = ['🔢 인원체크', '🛏️ 배정', '📊 개요', '📢 공지', '👦 등록', '💳 회비', '🎽 티셔츠', '📞 연락처', '🛡️ 보험', '📈 재정']
const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6']

export default function ForumAdmin() {
  const { authed, name: teacherName } = getAuth()
  const [tab, setTab] = useState(0)
  const router = useRouter()
  const TABS = teacherName === '박예찬' ? [...BASE_TABS, '📋 설문결과'] : BASE_TABS

  function logout() {
    clearAuth()
    router.push('/forum')
  }

  if (!authed) {
    router.push('/forum')
    return null
  }

  return (
    <div className="min-h-screen bg-[#e8f4ff]">
      <div className="bg-[#d0eaff] border-b border-[#0284c7]/20 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[#0369a1] font-black text-lg">선생님 관리</h1>
          <p className="text-black/40 text-xs">{teacherName} {getHonorific(teacherName)} · 다윗 어드벤처 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/forum')} className="text-[#0369a1] text-sm font-bold">나가기</button>
          <button onClick={logout} className="text-black/30 text-xs">로그아웃</button>
        </div>
      </div>

      <div className="flex border-b border-black/10 overflow-x-auto scrollbar-hide">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-none px-4 py-3 text-xs font-bold transition-all whitespace-nowrap ${
              tab === i ? 'text-[#0369a1] border-b-2 border-[#d4a843]' : 'text-black/40'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {tab === 0 && <AttendanceTab />}
        {tab === 1 && <AssignmentTab />}
        {tab === 2 && <OverviewTab setTab={setTab} />}
        {tab === 3 && <AnnouncementTab />}
        {tab === 4 && <StudentTab teacherName={teacherName} />}
        {tab === 5 && <FeeTab />}
        {tab === 6 && <TshirtTab />}
        {tab === 7 && <EmergencyTab />}
        {tab === 8 && <InsuranceTab />}
        {tab === 9 && <AdminFinanceTab />}
        {tab === 10 && teacherName === '박예찬' && <SurveyResultTab />}
      </div>
    </div>
  )
}

const VBS_DATE = '2026-08-07'

function OverviewTab({ setTab }: { setTab: (i: number) => void }) {
  const supabase = createClient()
  const [students, setStudents] = useState<Row[]>([])
  const [notices, setNotices] = useState<Row[]>([])
  const [now, setNow] = useState(new Date())
  const [openCard, setOpenCard] = useState<string | null>(null)
  const toggle = (key: string) => setOpenCard(v => v === key ? null : key)

  useEffect(() => {
    supabase.from('students').select('id, name, grade, fee_paid, allergy, note, id_number')
      .then(({ data }) => { if (data) setStudents(data) })
    supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setNotices(data) })
    const tick = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(tick)
  }, [])

  const totalStudents  = students.length
  const paidCount      = students.filter(s => s.fee_paid).length
  const specialCount   = students.filter(s => s.allergy || s.note).length
  const insuranceCount = students.filter(s => s.id_number).length

  const FULL_SCHEDULE = [
    { dt: '2026-08-01', label: '📽️ 영화 관람 (다윗)', sub: '8/1 (토)' },
    { dt: '2026-08-02T12:00', label: '📖 다윗 1과', sub: '8/2 (주일) 오후 12시' },
    { dt: '2026-08-07T11:30', label: '🚌 교회 출발', sub: '8/7 (금)' },
    { dt: '2026-08-07T13:00', label: '🏕️ 도착 및 숙소 배정', sub: '8/7 (금)' },
    { dt: '2026-08-07T14:00', label: '✝️ OT·개회예배 (다윗 2과)', sub: '8/7 (금)' },
    { dt: '2026-08-07T15:30', label: '⚔️ 다윗 어드벤처', sub: '8/7 (금)' },
    { dt: '2026-08-07T17:00', label: '🍽️ 저녁 식사', sub: '8/7 (금)' },
    { dt: '2026-08-07T19:30', label: '🙏 저녁 예배 (다윗 3과)', sub: '8/7 (금)' },
    { dt: '2026-08-07T21:00', label: '📝 공과·간식', sub: '8/7 (금)' },
    { dt: '2026-08-07T22:00', label: '🎉 셀러브레이션', sub: '8/7 (금)' },
    { dt: '2026-08-07T23:00', label: '💤 취침', sub: '8/7 (금)' },
    { dt: '2026-08-08T08:00', label: '🌅 기상 미션', sub: '8/8 (토)' },
    { dt: '2026-08-08T08:30', label: '🍳 반별 모임·식사', sub: '8/8 (토)' },
    { dt: '2026-08-08T10:00', label: '🏊 수영장', sub: '8/8 (토)' },
    { dt: '2026-08-08T15:00', label: '🚿 씻고 준비', sub: '8/8 (토)' },
    { dt: '2026-08-08T16:00', label: '🚌 교회로 출발', sub: '8/8 (토)' },
    { dt: '2026-08-08T17:00', label: '🏠 집으로', sub: '8/8 (토)' },
    { dt: '2026-08-09T12:00', label: '📖 다윗 4과', sub: '8/9 (주일) 오후 12시' },
  ]

  const nowMs = now.getTime()
  const currentItem = [...FULL_SCHEDULE].reverse().find(s => new Date(s.dt).getTime() <= nowMs) || null
  const nextItem = FULL_SCHEDULE.find(s => new Date(s.dt).getTime() > nowMs) || null

  const vbsDate = new Date(VBS_DATE); vbsDate.setHours(0,0,0,0)
  const today = new Date(); today.setHours(0,0,0,0)
  const diffDays = Math.round((vbsDate.getTime() - today.getTime()) / 86400000)
  const isPast = diffDays < 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 space-y-3" style={{background:'linear-gradient(135deg,#0369a1 0%,#0284c7 60%,#38bdf8 100%)'}}>
        {isPast ? (
          <div className="text-center py-2">
            <p className="text-3xl mb-1">🎉</p>
            <p className="text-white font-black text-lg">수련회 완료!</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs">성경학교까지</p>
              <p className="text-white font-black text-4xl leading-none mt-0.5">D-{diffDays}</p>
            </div>
            <div className="text-5xl opacity-90">⛺</div>
          </div>
        )}
        {(() => {
          const days = ['일','월','화','수','목','금','토']
          const fmtDt = (dt: string) => {
            const hasTime = dt.includes('T')
            const d = new Date(dt)
            const base = `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]})`
            return hasTime ? `${base} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : base
          }
          const nowDateLabel = currentItem
            ? fmtDt(currentItem.dt)
            : `${now.getMonth()+1}/${now.getDate()}(${days[now.getDay()]})`
          const fmtNext = nextItem ? fmtDt(nextItem.dt) : null
          return (
            <div className="flex gap-2 items-stretch">
              <div className="flex-1">
                <p className="text-white/60 text-xs font-bold mb-1">현재 · <span className="font-normal">{nowDateLabel}</span></p>
                <div className="rounded-xl px-3 py-2.5 bg-white/15 border border-white/20">
                  {currentItem
                    ? <p className="text-white font-black text-sm leading-tight">{currentItem.label}</p>
                    : <p className="text-white/50 text-sm font-medium">일정 없음</p>}
                </div>
              </div>
              <div className="flex items-end pb-2 text-white/30 text-xl">→</div>
              <div className="flex-1">
                <p className="text-white/60 text-xs font-bold mb-1">다음 · <span className="font-normal">{fmtNext || '-'}</span></p>
                <div className="rounded-xl px-3 py-2.5 bg-white/10 border border-white/15">
                  {nextItem
                    ? <p className="text-white/90 font-black text-sm leading-tight">{nextItem.label}</p>
                    : <p className="text-white/40 text-sm font-medium">모든 일정 완료</p>}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => toggle('reg')} className="card-dark rounded-2xl p-4 text-left active:scale-95 transition-transform">
          <p className="text-black/40 text-xs mb-1">총 등록</p>
          <p className="text-[#0c1a26] font-black text-3xl">{totalStudents}<span className="text-sm font-normal text-black/40">명</span></p>
        </button>
        <button onClick={() => toggle('fee')} className="card-dark rounded-2xl p-4 text-left active:scale-95 transition-transform">
          <p className="text-black/40 text-xs mb-1">회비 납부</p>
          <p className="text-green-400 font-black text-3xl">{paidCount}<span className="text-sm font-normal text-black/40">/{totalStudents}</span></p>
          <div className="mt-2 h-1.5 bg-black/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: totalStudents > 0 ? `${(paidCount/totalStudents)*100}%` : '0%' }} />
          </div>
        </button>
        <button onClick={() => toggle('special')} className="card-dark rounded-2xl p-4 text-left active:scale-95 transition-transform">
          <p className="text-black/40 text-xs mb-1">⚠️ 특이사항</p>
          <p className={`font-black text-3xl ${specialCount > 0 ? 'text-orange-400' : 'text-black/30'}`}>
            {specialCount}<span className="text-sm font-normal text-black/40">명</span>
          </p>
        </button>
        <button onClick={() => toggle('insurance')} className="card-dark rounded-2xl p-4 text-left active:scale-95 transition-transform">
          <p className="text-black/40 text-xs mb-1">🛡️ 여행자보험</p>
          <p className={`font-black text-3xl ${insuranceCount === totalStudents && totalStudents > 0 ? 'text-green-400' : 'text-[#0369a1]'}`}>
            {insuranceCount}<span className="text-sm font-normal text-black/40">/{totalStudents}</span>
          </p>
        </button>
      </div>

      {openCard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setOpenCard(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-4" />

            {openCard === 'reg' && <>
              <p className="font-bold text-[#0c1a26] mb-3">전체 등록자 ({totalStudents}명)</p>
              <div className="overflow-y-auto">
                {(() => { const st = students.filter(s => !['선생님','봉사자'].includes(s.grade)); return <>
                  <p className="text-[#0369a1] text-xs font-bold mb-1">👦 학생 ({st.length}명)</p>
                  {st.map(s => (
                    <div key={s.id} className="flex justify-between py-2 border-b border-black/5 last:border-0">
                      <span className="text-sm text-[#1a1008]">{s.name}</span>
                      <span className="text-black/30 text-xs">{s.grade}</span>
                    </div>
                  ))}
                </> })()}
                {(() => { const tc = students.filter(s => ['선생님','봉사자'].includes(s.grade)); return tc.length > 0 && <>
                  <p className="text-blue-400 text-xs font-bold mt-3 mb-1">👨‍🏫 선생님 ({tc.length}명)</p>
                  {tc.map(s => (
                    <div key={s.id} className="flex justify-between py-2 border-b border-black/5 last:border-0">
                      <span className="text-sm text-[#1a1008]">{s.name}</span>
                      <span className="text-black/30 text-xs">{getDisplayGrade(s.name, s.grade)}</span>
                    </div>
                  ))}
                </> })()}
              </div>
            </>}

            {openCard === 'fee' && <>
              <p className="font-bold text-[#0c1a26] mb-3">회비 납부 현황</p>
              <div className="overflow-y-auto">
                <p className="text-green-400 text-xs font-bold mb-1">✅ 납부 완료 ({paidCount}명)</p>
                {students.filter(s => s.fee_paid).map(s => (
                  <div key={s.id} className="flex justify-between py-2 border-b border-black/5 last:border-0">
                    <span className="text-sm text-[#1a1008]">{s.name}</span>
                    <span className="text-green-400 text-xs">납부</span>
                  </div>
                ))}
                {(() => { const unpaid = students.filter(s => !s.fee_paid && !['선생님','봉사자'].includes(s.grade)); return unpaid.length > 0 && <>
                  <p className="text-red-400 text-xs font-bold mt-3 mb-1">❌ 미납 ({unpaid.length}명)</p>
                  {unpaid.map(s => (
                    <div key={s.id} className="flex justify-between py-2 border-b border-black/5 last:border-0">
                      <span className="text-sm text-[#1a1008]">{s.name}</span>
                      <span className="text-red-400 text-xs">미납</span>
                    </div>
                  ))}
                </> })()}
                {(() => { const exempt = students.filter(s => ['선생님','봉사자'].includes(s.grade)); return exempt.length > 0 && <>
                  <p className="text-blue-400 text-xs font-bold mt-3 mb-1">🔵 면제 ({exempt.length}명)</p>
                  {exempt.map(s => (
                    <div key={s.id} className="flex justify-between py-2 border-b border-black/5 last:border-0">
                      <span className="text-sm text-[#1a1008]">{s.name}</span>
                      <span className="text-blue-400 text-xs">면제</span>
                    </div>
                  ))}
                </> })()}
              </div>
            </>}

            {openCard === 'special' && <>
              <p className="font-bold text-[#0c1a26] mb-3">특이사항 ({specialCount}명)</p>
              <div className="overflow-y-auto">
                {specialCount === 0
                  ? <p className="text-black/30 text-sm">특이사항 없음</p>
                  : students.filter(s => s.allergy || s.note).map(s => (
                    <div key={s.id} className="py-2.5 border-b border-black/5 last:border-0">
                      <p className="text-sm font-semibold text-[#1a1008]">{s.name}</p>
                      {s.allergy && <p className="text-orange-400 text-xs mt-0.5">🚨 알레르기: {s.allergy}</p>}
                      {s.note && <p className="text-black/50 text-xs mt-0.5">📝 비고: {s.note}</p>}
                    </div>
                  ))
                }
              </div>
            </>}

            {openCard === 'insurance' && <>
              <p className="font-bold text-[#0c1a26] mb-3">여행자보험 현황</p>
              <div className="overflow-y-auto">
                <p className="text-[#0369a1] text-xs font-bold mb-1">✅ 제출 ({insuranceCount}명)</p>
                {students.filter(s => s.id_number).map(s => (
                  <div key={s.id} className="flex justify-between py-2 border-b border-black/5 last:border-0">
                    <span className="text-sm text-[#1a1008]">{s.name}</span>
                    <span className="text-[#0369a1] text-xs">제출</span>
                  </div>
                ))}
                {students.filter(s => !s.id_number).length > 0 && <>
                  <p className="text-red-400 text-xs font-bold mt-3 mb-1">❌ 미제출 ({students.filter(s => !s.id_number).length}명)</p>
                  {students.filter(s => !s.id_number).map(s => (
                    <div key={s.id} className="flex justify-between py-2 border-b border-black/5 last:border-0">
                      <span className="text-sm text-[#1a1008]">{s.name}</span>
                      <span className="text-red-400 text-xs">미제출</span>
                    </div>
                  ))}
                </>}
              </div>
            </>}

            <button onClick={() => setOpenCard(null)} className="mt-4 w-full py-3 rounded-2xl bg-black/5 text-black/40 text-sm font-bold">닫기</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-4 space-y-2" style={{background:'linear-gradient(135deg,#065f46 0%,#059669 60%,#34d399 100%)'}}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-white/70 text-xs font-bold">📢 중요공지</p>
          <p className="text-white/40 text-xs">{notices.length}건</p>
        </div>
        {notices.length === 0
          ? <p className="text-white/50 text-sm">등록된 공지가 없습니다</p>
          : notices.slice(0, 2).map(n => (
            <div key={n.id} className="rounded-xl px-3 py-2.5 bg-white/10 border border-white/15 cursor-pointer active:opacity-80" onClick={() => toggle('notice_' + n.id)}>
              <p className="text-white font-bold text-sm">{n.title}</p>
              {n.content && <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{n.content}</p>}
            </div>
          ))
        }
      </div>

      {openCard && openCard.startsWith('notice_') && (() => {
        const nid = openCard.replace('notice_', '')
        const n = notices.find(x => String(x.id) === nid)
        if (!n) return null
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setOpenCard(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-4" />
              <p className="font-bold text-[#0c1a26] mb-1">{n.title}</p>
              <p className="text-black/30 text-xs mb-3">{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
              <div className="overflow-y-auto">
                <p className="text-black/70 text-sm leading-relaxed whitespace-pre-line">{n.content}</p>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function AnnouncementTab() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Row[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  useEffect(() => { fetchAnnouncements() }, [])

  async function fetchAnnouncements() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    if (data) setAnnouncements(data)
  }

  async function post() {
    if (!title.trim()) return
    setPosting(true)
    await supabase.from('announcements').insert({ title, content, is_published: true })
    setTitle(''); setContent('')
    await fetchAnnouncements()
    setPosting(false)
  }

  async function togglePublish(a: Row) {
    const newVal = !a.is_published
    await supabase.from('announcements').update({ is_published: newVal }).eq('id', a.id)
    if (newVal) {
      try {
        const seen = JSON.parse(localStorage.getItem('seen_notices') || '[]')
        localStorage.setItem('seen_notices', JSON.stringify(seen.filter((id: number) => id !== a.id)))
      } catch {}
    }
    fetchAnnouncements()
  }

  async function del(id: number) {
    await supabase.from('announcements').delete().eq('id', id)
    fetchAnnouncements()
  }

  function startEdit(a: Row) {
    setEditId(a.id)
    setEditTitle(a.title)
    setEditContent(a.content || '')
  }

  async function saveEdit() {
    await supabase.from('announcements').update({ title: editTitle, content: editContent }).eq('id', editId)
    setEditId(null)
    fetchAnnouncements()
  }

  return (
    <div className="space-y-4">
      <div className="card-dark rounded-2xl p-4 space-y-3">
        <h3 className="text-[#0369a1] font-bold">공지 작성</h3>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목"
          className="w-full bg-black/5 rounded-xl px-3 py-3 text-[#0c1a26] placeholder-black/35 outline-none text-sm" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용 (선택)" rows={3}
          className="w-full bg-black/5 rounded-xl px-3 py-3 text-[#0c1a26] placeholder-black/35 outline-none text-sm resize-none" />
        <button onClick={post} disabled={posting || !title.trim()}
          className="w-full btn-gold py-3 rounded-xl font-bold text-sm disabled:opacity-40">
          {posting ? '게시중...' : '📢 공지 게시'}
        </button>
      </div>

      <p className="text-black/40 text-xs">게시하면 앱 첫 화면에서 팝업으로 표시됩니다</p>

      {announcements.filter(a => a.is_published).length > 0 && (
        <>
          <p className="text-green-500 text-xs font-bold">📢 게시중인 공지</p>
          {announcements.filter(a => a.is_published).map(a => (
            <div key={a.id} className="card-dark rounded-2xl p-4 border border-green-400/20">
              {editId === a.id ? (
                <div className="space-y-2">
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-black/5 rounded-xl px-3 py-2 text-sm outline-none border border-black/10" />
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                    className="w-full bg-black/5 rounded-xl px-3 py-2 text-sm outline-none border border-black/10 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex-1 btn-gold py-2 rounded-xl text-xs font-bold">저장</button>
                    <button onClick={() => setEditId(null)} className="flex-1 bg-black/5 text-black/40 py-2 rounded-xl text-xs">취소</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#1a1008]">{a.title}</p>
                    {a.content && <p className="text-black/50 text-xs mt-1 line-clamp-2">{a.content}</p>}
                    <p className="text-black/30 text-xs mt-1">{new Date(a.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    <button onClick={() => startEdit(a)} className="text-xs px-2 py-1 rounded-lg bg-[#0284c7]/20 text-[#0369a1] font-bold">수정</button>
                    <button onClick={() => togglePublish(a)} className="text-xs px-2 py-1 rounded-lg bg-black/10 text-black/50 font-bold">비공개전환</button>
                    <button onClick={() => del(a.id)} className="text-xs px-2 py-1 rounded-lg bg-red-600/20 text-red-400 font-bold">삭제</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {announcements.filter(a => !a.is_published).length > 0 && (
        <>
          <p className="text-black/30 text-xs font-bold">🔒 비공개 공지</p>
          {announcements.filter(a => !a.is_published).map(a => (
            <div key={a.id} className="card-dark rounded-2xl p-4 opacity-60">
              {editId === a.id ? (
                <div className="space-y-2">
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-black/5 rounded-xl px-3 py-2 text-sm outline-none border border-black/10" />
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                    className="w-full bg-black/5 rounded-xl px-3 py-2 text-sm outline-none border border-black/10 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex-1 btn-gold py-2 rounded-xl text-xs font-bold">저장</button>
                    <button onClick={() => setEditId(null)} className="flex-1 bg-black/5 text-black/40 py-2 rounded-xl text-xs">취소</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-black/50">{a.title}</p>
                    {a.content && <p className="text-black/40 text-xs mt-1 line-clamp-2">{a.content}</p>}
                    <p className="text-black/25 text-xs mt-1">{new Date(a.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    <button onClick={() => startEdit(a)} className="text-xs px-2 py-1 rounded-lg bg-[#0284c7]/20 text-[#0369a1] font-bold">수정</button>
                    <button onClick={() => togglePublish(a)} className="text-xs px-2 py-1 rounded-lg bg-green-600/20 text-green-400 font-bold">공개전환</button>
                    <button onClick={() => del(a.id)} className="text-xs px-2 py-1 rounded-lg bg-red-600/20 text-red-400 font-bold">삭제</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {announcements.length === 0 && <EmptyState text="공지사항이 없습니다" />}
    </div>
  )
}

function StudentTab({ teacherName }: { teacherName: string }) {
  const supabase = createClient()
  const isAdmin = teacherName === '박예찬'
  const [students, setStudents] = useState<Row[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<Row | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Row | null>(null)
  const [editForm, setEditForm] = useState<Row>({})

  useEffect(() => { fetchStudents() }, [])

  async function fetchStudents() {
    const { data } = await supabase.from('students').select('*').order('name')
    if (data) setStudents(data)
  }

  const FIXED_DELETED = [
    { id: 'fixed-1', name: '배서윤', note: '취소', deleted_at: '2026-07-25T00:00:00.000Z' },
    { id: 'fixed-2', name: '이가온', note: '취소', deleted_at: '2026-07-25T00:00:00.000Z' },
    { id: 'fixed-3', name: '허주원', note: '취소', deleted_at: '2026-07-25T00:00:00.000Z' },
  ]

  function getDeletedList() {
    try {
      const local = JSON.parse(localStorage.getItem('deleted_students') || '[]')
      const localIds = local.map((s: Row) => s.id)
      const extras = FIXED_DELETED.filter(s => !localIds.includes(s.id))
      return [...local, ...extras]
    } catch { return FIXED_DELETED }
  }

  function saveToDeletedList(student: Row) {
    const list = getDeletedList()
    list.unshift({ ...student, deleted_at: new Date().toISOString() })
    localStorage.setItem('deleted_students', JSON.stringify(list.slice(0, 50)))
  }

  function startEditStudent(s: Row) {
    setEditTarget(s)
    setEditForm({ name: s.name || '', grade: s.grade || '', parent_name: s.parent_name || '', parent_phone: s.parent_phone || '', tshirt_size: s.tshirt_size || '', allergy: s.allergy || '', note: s.note || '' })
  }

  async function saveEditStudent() {
    if (!editForm.name.trim()) { alert('이름을 입력해주세요'); return }
    const { error } = await supabase.from('students').update({
      name: editForm.name.trim(),
      grade: editForm.grade,
      parent_name: editForm.parent_name,
      parent_phone: editForm.parent_phone,
      tshirt_size: editForm.tshirt_size,
      allergy: editForm.allergy,
      note: editForm.note,
    }).eq('id', editTarget!.id)
    if (error) { alert('저장 실패: ' + error.message); return }
    setEditTarget(null)
    fetchStudents()
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    saveToDeletedList(confirmTarget)
    await supabase.from('students').delete().eq('id', confirmTarget.id)
    setConfirmTarget(null)
    fetchStudents()
  }

  async function restore(student: Row) {
    setRestoring(student.id)
    const { deleted_at, id, ...data } = student
    await supabase.from('students').insert(data)
    const list = getDeletedList().filter((s: Row) => !(s.id === id && s.deleted_at === deleted_at))
    localStorage.setItem('deleted_students', JSON.stringify(list))
    setRestoring(null)
    fetchStudents()
  }

  const byGrade = GRADES.map(grade => ({
    grade,
    students: students.filter(s => s.grade === grade),
  })).filter(g => g.students.length > 0)

  const others = students.filter(s => !GRADES.includes(s.grade))
  const totalCount = students.length
  const hasNoteCount = students.filter(s => s.allergy || s.note).length
  function hasSpecial(s: Row) { return !!(s.allergy || s.note) }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 card-dark rounded-2xl p-3 text-center">
          <p className="text-[#0369a1] font-black text-2xl">{totalCount}</p>
          <p className="text-black/50 text-xs mt-0.5">총 등록</p>
        </div>
        <div className="flex-1 card-dark rounded-2xl p-3 text-center">
          <p className="text-orange-400 font-black text-2xl">{hasNoteCount}</p>
          <p className="text-black/50 text-xs mt-0.5">특이사항</p>
        </div>
      </div>
      <button onClick={() => setShowRegister(true)}
        className="w-full btn-gold py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2">
        ✍️ 학생 직접 등록하기
      </button>
      {isAdmin && (
        <button onClick={() => setShowDeleted(true)}
          className="w-full bg-red-50 border border-red-200 py-3 rounded-2xl font-bold text-sm text-red-500 flex items-center justify-center gap-2">
          🗑️ 삭제된 학생 목록 ({getDeletedList().length}명)
        </button>
      )}
      {isAdmin && (
        <button onClick={async () => {
          const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Seoul' })
          const { data } = await supabase.from('announcements').select('id').eq('title', '__reg_open__').maybeSingle()
          if (data) {
            await supabase.from('announcements').update({ content: today }).eq('id', data.id)
          } else {
            await supabase.from('announcements').insert({ title: '__reg_open__', content: today, is_published: false })
          }
          alert('✅ 오늘 자정까지 등록이 열렸습니다.')
        }} className="w-full bg-green-50 border border-green-200 py-3 rounded-2xl font-bold text-sm text-green-600 flex items-center justify-center gap-2">
          🔓 등록 오늘 하루 임시 열기
        </button>
      )}
      {showRegister && <RegisterModal onClose={() => { setShowRegister(false); fetchStudents() }} />}

      {editTarget && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={() => setEditTarget(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-4" />
            <p className="font-bold text-[#0c1a26] mb-4">✏️ 정보 수정 — {editTarget.name}</p>
            <div className="overflow-y-auto space-y-3 flex-1">
              {[
                { label: '이름', key: 'name' },
                { label: '학년', key: 'grade' },
                { label: '보호자 이름', key: 'parent_name' },
                { label: '보호자 연락처', key: 'parent_phone' },
                { label: '티셔츠 사이즈', key: 'tshirt_size' },
                { label: '알레르기', key: 'allergy' },
                { label: '기타 특이사항', key: 'note' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <p className="text-black/40 text-xs mb-1">{label}</p>
                  <input value={editForm[key]} onChange={e => setEditForm((p: Row) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-black/5 rounded-xl px-3 py-2.5 text-sm text-[#0c1a26] outline-none border border-black/10 focus:border-[#0284c7]/50" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveEditStudent} className="flex-1 btn-gold py-3 rounded-2xl font-bold">저장</button>
              <button onClick={() => setEditTarget(null)} className="flex-1 bg-black/5 text-black/50 py-3 rounded-2xl font-bold">취소</button>
            </div>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-[#0c1a26] font-black text-lg">{confirmTarget.name} 학생을 삭제할까요?</p>
              <p className="text-black/50 text-sm mt-1">삭제 후에는 {isAdmin ? '삭제 목록에서 복구' : '복구할 수 없'}습니다.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmTarget(null)} className="flex-1 bg-black/5 text-black/60 py-3 rounded-2xl font-bold">취소</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-bold">삭제</button>
            </div>
          </div>
        </div>
      )}

      {showDeleted && isAdmin && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[80svh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <p className="font-black text-[#0c1a26] text-lg">🗑️ 삭제된 학생 목록</p>
              <button onClick={() => setShowDeleted(false)} className="text-black/40 text-2xl">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2">
              {getDeletedList().length === 0 ? (
                <p className="text-black/30 text-sm text-center py-8">삭제된 학생이 없습니다</p>
              ) : getDeletedList().map((s: Row, i: number) => (
                <div key={i} className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#0c1a26] text-sm">{s.name} <span className="text-black/40 font-normal">{getDisplayGrade(s.name, s.grade)}</span></p>
                    <p className="text-black/30 text-xs mt-0.5">삭제: {new Date(s.deleted_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button onClick={() => restore(s)} disabled={restoring === s.id}
                    className="text-xs px-3 py-2 bg-[#0369a1] text-white rounded-xl font-bold disabled:opacity-40">
                    {restoring === s.id ? '...' : '복구'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState text="등록된 학생이 없습니다" sub="학부모가 온라인으로 등록하면 여기에 표시됩니다" />
      ) : (
        <>
          {[...byGrade, ...(others.length > 0 ? [{ grade: '선생님', students: others }] : [])].map(({ grade, students: list }) => (
            <div key={grade}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#0369a1] font-bold text-sm">{grade}</span>
                <span className="text-black/30 text-xs">{list.length}명</span>
              </div>
              <div className="space-y-2">
                {list.map(s => (
                  <div key={s.id}
                    className={`rounded-2xl p-4 ${hasSpecial(s) ? 'border border-orange-400/40 bg-orange-400/5' : 'card-dark'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#0c1a26] font-bold">{s.name}</span>
                          {s.tshirt_size && (
                            <span className="text-xs bg-black/10 text-black/60 px-2 py-0.5 rounded-full">
                              {s.tshirt_size}{/^\d+$/.test(s.tshirt_size) ? '호' : ''}
                            </span>
                          )}
                          {hasSpecial(s) && (
                            <span className="text-xs bg-orange-400/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">⚠️ 특이사항</span>
                          )}
                          {s.registered_at && <span className="text-xs text-[#0369a1]/70">온라인</span>}
                        </div>
                        {s.parent_name && (
                          <p className="text-black/50 text-xs mt-1">
                            👨‍👧 {s.parent_name}
                            {s.parent_phone && <span className="ml-2">📞 {s.parent_phone}</span>}
                          </p>
                        )}
                        {hasSpecial(s) && (
                          <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="text-orange-400 text-xs mt-1 font-bold">
                            {expanded === s.id ? '▲ 접기' : '▼ 특이사항 보기'}
                          </button>
                        )}
                        {expanded === s.id && (
                          <div className="mt-2 space-y-1 bg-orange-400/10 rounded-xl p-3">
                            {s.allergy && <p className="text-orange-300 text-xs">🚨 알레르기: {s.allergy}</p>}
                            {s.note && <p className="text-black/70 text-xs">📝 기타: {s.note}</p>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEditStudent(s)} className="text-[#0369a1] text-xs px-2 py-1">수정</button>
                        <button onClick={() => setConfirmTarget(s)} className="text-red-400/50 text-xs px-2 py-1">삭제</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function FeeTab() {
  const supabase = createClient()
  const [students, setStudents] = useState<Row[]>([])
  const [saving, setSaving] = useState<number | null>(null)
  const [choosing, setChoosing] = useState<number | null>(null)

  useEffect(() => { fetchStudents() }, [])

  async function fetchStudents() {
    const { data } = await supabase.from('students').select('*').order('grade').order('name')
    if (data) setStudents(data)
  }

  async function payWithType(s: Row, type: string) {
    setChoosing(null)
    setStudents(prev => prev.map(x => x.id === s.id ? { ...x, fee_paid: true, student_type: type } : x))
    const { error } = await supabase.from('students').update({ fee_paid: true, student_type: type }).eq('id', s.id)
    if (error) { alert('저장 실패: ' + error.message); fetchStudents() }
  }

  async function cancelFee(s: Row) {
    setStudents(prev => prev.map(x => x.id === s.id ? { ...x, fee_paid: false, student_type: null } : x))
    const { error } = await supabase.from('students').update({ fee_paid: false, student_type: null }).eq('id', s.id)
    if (error) { alert('저장 실패: ' + error.message); fetchStudents() }
  }

  const teachers    = students.filter(s => ['선생님','봉사자'].includes(s.grade))
  const nonTeachers = students.filter(s => !['선생님','봉사자'].includes(s.grade))
  const paidCount   = nonTeachers.filter(s => s.fee_paid).length
  const unpaidCount = nonTeachers.filter(s => !s.fee_paid).length
  const totalAmount = nonTeachers.filter(s => s.fee_paid).reduce((sum, s) => sum + calcFee(s), 0)

  const TYPE_OPTIONS = [
    { type: '별내오륜교회', label: '⛪ 별내오륜교회', bg: 'bg-[#0284c7]' },
    { type: '새친구',      label: '🌱 새친구',      bg: 'bg-purple-500' },
    { type: '헌친구',      label: '🤝 헌친구',      bg: 'bg-orange-500' },
  ]
  const typeStyle: Record<string, string> = { '별내오륜교회': 'text-[#0369a1]', '새친구': 'text-purple-500', '헌친구': 'text-orange-500' }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="card-dark rounded-2xl p-3 text-center">
          <p className="text-green-400 font-black text-xl">{paidCount}</p>
          <p className="text-black/50 text-xs mt-0.5">납부</p>
        </div>
        <div className="card-dark rounded-2xl p-3 text-center">
          <p className="text-red-400 font-black text-xl">{unpaidCount}</p>
          <p className="text-black/50 text-xs mt-0.5">미납</p>
        </div>
        <div className="card-dark rounded-2xl p-3 text-center">
          <p className="text-[#0369a1] font-black text-base">{(totalAmount / 10000).toFixed(0)}만</p>
          <p className="text-black/50 text-xs mt-0.5">수납액</p>
        </div>
      </div>

      {students.length === 0 ? <EmptyState text="등록된 학생이 없습니다" /> : (
        <div className="space-y-2">
          {teachers.length > 0 && (
            <div>
              <p className="text-blue-500 text-xs font-bold mb-2">👨‍🏫 선생님 — 회비 면제 ({teachers.length}명)</p>
              {teachers.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-2xl px-4 py-3 mb-2 bg-blue-50 border border-blue-200">
                  <div>
                    <span className="font-semibold text-sm text-[#1a1008]">{s.name}</span>
                    <span className="text-black/30 text-xs ml-2">{getDisplayGrade(s.name, s.grade)}</span>
                  </div>
                  <span className="text-blue-500 text-xs font-bold px-3 py-2 bg-blue-100 rounded-xl">면제</span>
                </div>
              ))}
            </div>
          )}

          {nonTeachers.filter(s => !s.fee_paid).length > 0 && (
            <div>
              <p className="text-red-400 text-xs font-bold mb-2">❌ 미납 ({nonTeachers.filter(s => !s.fee_paid).length}명)</p>
              {nonTeachers.filter(s => !s.fee_paid).map(s => (
                <div key={s.id} className="card-dark rounded-2xl px-4 py-3 mb-2 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm text-[#1a1008]">{s.name}</span>
                      {s.sibling_discount && <span className="ml-1 text-xs text-[#0369a1] font-bold">형제할인</span>}
                      <span className="text-black/30 text-xs ml-2">{getDisplayGrade(s.name, s.grade)}</span>
                      {s.parent_name && <p className="text-black/40 text-xs mt-0.5">{s.parent_name}</p>}
                    </div>
                    <button onClick={() => setChoosing(choosing === s.id ? null : s.id)} disabled={saving === s.id}
                      className="text-xs px-3 py-2 rounded-xl font-bold bg-[#0284c7] text-white disabled:opacity-40">
                      {saving === s.id ? '...' : choosing === s.id ? '취소 ✕' : '○ 납부 처리'}
                    </button>
                  </div>
                  {choosing === s.id && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {TYPE_OPTIONS.map(opt => (
                        <button key={opt.type} onClick={() => payWithType(s, opt.type)}
                          className={`${opt.bg} text-white text-xs py-2.5 rounded-xl font-bold`}>
                          {opt.label}<br/>
                          <span className="font-normal text-white/70 text-[10px]">
                            {opt.type === '새친구' ? '면제' : opt.type === '헌친구' ? '30,000원' : s.sibling_discount ? '40,000원' : '50,000원'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {nonTeachers.filter(s => s.fee_paid).length > 0 && (
            <div>
              <p className="text-green-400 text-xs font-bold mb-2">✅ 납부 완료 ({nonTeachers.filter(s => s.fee_paid).length}명)</p>
              {nonTeachers.filter(s => s.fee_paid).map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-2xl px-4 py-3 mb-2 bg-green-600/10 border border-green-500/20">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-black/70">{s.name}</span>
                      {s.sibling_discount && <span className="text-xs text-[#0369a1] font-bold">형제할인</span>}
                      {s.student_type && (
                        <span className={`text-xs font-bold ${typeStyle[s.student_type] || 'text-black/40'}`}>
                          {s.student_type === '별내오륜교회' ? '⛪ 별내오륜교회' : s.student_type === '새친구' ? '🌱 새친구' : '🤝 헌친구'}
                        </span>
                      )}
                    </div>
                    <p className="text-black/40 text-xs mt-0.5">{feeLabel(s)}</p>
                  </div>
                  <button onClick={() => cancelFee(s)} disabled={saving === s.id}
                    className="text-xs px-3 py-2 rounded-xl font-bold text-black/30 bg-black/5">
                    {saving === s.id ? '...' : '취소'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AdminFinanceTab() {
  const supabase = createClient()
  const [ledger, setLedger] = useState<Row[]>([])
  const [income, setIncome] = useState<Row[]>([])
  const [budget, setBudget] = useState<Row[]>([])
  const [students, setStudents] = useState<Row[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('ledger').select('*').order('expense_date', { ascending: false }),
      supabase.from('budget').select('*'),
      supabase.from('students').select('id,name,grade,fee_paid'),
      supabase.from('income').select('*').order('income_date', { ascending: false }),
    ]).then(([{ data: l }, { data: b }, { data: s }, { data: inc }]) => {
      if (l) setLedger(l); if (b) setBudget(b); if (s) setStudents(s); if (inc) setIncome(inc)
    })
  }, [])

  const paidStudents = students.filter(s => s.fee_paid)
  const feeTotal = paidStudents.reduce((sum, s) => sum + (s.sibling_discount ? 40000 : 50000), 0)
  const otherTotal = income.reduce((sum, i) => sum + (i.amount || 0), 0)
  const totalIncome = feeTotal + otherTotal
  const totalExpense = ledger.reduce((sum, l) => sum + (l.amount || 0), 0)
  const totalBudget = budget.reduce((sum, b) => sum + (b.amount || 0), 0)
  const expectedIncome = students.filter(s => s.grade !== "선생님").reduce((sum, s) => sum + (s.sibling_discount ? 40000 : 50000), 0)

  return (
    <FinanceTab
      ledger={ledger} income={income} budget={budget} students={students}
      paidStudents={paidStudents} feeTotal={feeTotal} otherTotal={otherTotal}
      totalIncome={totalIncome} totalExpense={totalExpense}
      totalBudget={totalBudget} expectedIncome={expectedIncome}
      onRefresh={() => {}}
    />
  )
}

const T_SIZE_ORDER = ['110', '120', '130', '140', '150', 'SS', 'S', 'M', 'L', 'LL', '3L', '4L']

function TshirtTab() {
  const supabase = createClient()
  const [students, setStudents] = useState<Row[]>([])
  const [openSize, setOpenSize] = useState<string | null>(null)
  useEffect(() => { supabase.from('students').select('id,name,grade,tshirt_size').then(({ data }) => { if (data) setStudents(data) }) }, [])

  const counts: Record<string, number> = {}
  T_SIZE_ORDER.forEach(s => { counts[s] = 0 })
  students.forEach(s => { if (s.tshirt_size && counts[s.tshirt_size] !== undefined) counts[s.tshirt_size]++ })
  const total = students.length
  const noSize = students.filter(s => !s.tshirt_size).length

  const COLS = 4
  const openIdx = openSize ? T_SIZE_ORDER.indexOf(openSize) : -1
  const openList = openSize ? students.filter(s => s.tshirt_size === openSize) : []

  const rows: string[][] = []
  for (let i = 0; i < T_SIZE_ORDER.length; i += COLS) {
    rows.push(T_SIZE_ORDER.slice(i, i + COLS))
  }

  return (
    <div className="space-y-3">
      <p className="text-black/50 text-sm">총 {total}명 · 미기재 <span className="text-orange-400">{noSize}명</span></p>
      <div className="space-y-2">
        {rows.map((row, rowIdx) => {
          const rowContainsOpen = openSize && row.includes(openSize)
          return (
            <React.Fragment key={rowIdx}>
              <div className="grid grid-cols-4 gap-2">
                {row.map(size => (
                  <button key={size} onClick={() => setOpenSize(openSize === size ? null : size)}
                    className={`card-dark rounded-2xl p-3 text-center transition-all active:scale-95 ${openSize === size ? 'border-2 border-[#d4a843]' : counts[size] > 0 ? 'border border-[#0284c7]/20' : ''}`}>
                    <p className="text-black/40 text-xs mb-1">{size}</p>
                    <p className={`text-2xl font-black ${counts[size] > 0 ? 'text-[#0369a1]' : 'text-black/20'}`}>{counts[size]}</p>
                  </button>
                ))}
              </div>
              {rowContainsOpen && (
                <div className="card-dark rounded-2xl overflow-hidden border border-[#d4a843]/30">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5" style={{ background: 'rgba(212,168,67,0.08)' }}>
                    <span className="font-black text-[#d4a843] text-sm">🎽 {openSize} 사이즈</span>
                    <span className="text-black/40 text-xs">{openList.length}명</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {openList.length === 0 ? (
                      <p className="text-black/30 text-sm w-full text-center py-2">해당 없음</p>
                    ) : openList.map(s => (
                      <div key={s.id} className="flex items-center gap-1.5 bg-[#0284c7]/8 rounded-xl px-3 py-2">
                        <span className="text-[#0c1a26] font-bold text-sm">{s.name}</span>
                        <span className="text-black/30 text-xs">{getDisplayGrade(s.name, s.grade)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      <div className="card-dark rounded-2xl overflow-hidden">
        <button onClick={() => setOpenSize(openSize === '__list__' ? null : '__list__')}
          className="w-full flex items-center justify-between px-4 py-3 active:opacity-70">
          <span className="text-black/60 text-sm font-bold">🎽 티셔츠 신청자 명단</span>
          <span className="text-black/30 text-sm">{openSize === '__list__' ? '▲' : '▼'}</span>
        </button>
        {openSize === '__list__' && (
          <div className="border-t border-black/5 divide-y divide-black/5">
            {T_SIZE_ORDER.flatMap(size =>
              students.filter(s => s.tshirt_size === size).map(s => ({ ...s, _size: size }) as Row & { _size: string })
            ).map((s, i) => (
              <div key={(s.id as string) ?? i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[#0c1a26] font-bold text-sm">{s.name}</span>
                  <span className="text-black/30 text-xs">{getDisplayGrade(s.name, s.grade)}</span>
                </div>
                <span className="text-[#0369a1] font-black text-sm">{s._size}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmergencyTab() {
  const supabase = createClient()
  const [students, setStudents] = useState<Row[]>([])
  const [search, setSearch] = useState('')
  useEffect(() => { supabase.from('students').select('id,name,grade,parent_name,parent_phone').order('grade').then(({ data }) => { if (data) setStudents(data) }) }, [])

  const filtered = students.filter(s => !search || s.name.includes(search) || (s.parent_name || '').includes(search))

  function copyAll() {
    const text = filtered.map(s => `${s.name}(${s.grade}) - ${s.parent_name || '-'} : ${s.parent_phone || '-'}`).join('\n')
    navigator.clipboard.writeText(text)
    alert('복사됐습니다!')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 검색"
          className="flex-1 bg-black/5 rounded-xl px-3 py-2.5 text-[#0c1a26] placeholder-black/35 outline-none text-sm border border-black/10" />
        <button onClick={copyAll} className="btn-gold px-4 py-2 rounded-xl text-xs font-bold shrink-0">전체복사</button>
      </div>
      <div className="space-y-2">
        {filtered.map(s => (
          <div key={s.id} className="card-dark rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[#0c1a26] font-bold text-sm">{s.name} <span className="text-black/30 font-normal text-xs">{getDisplayGrade(s.name, s.grade)}</span></p>
              <p className="text-black/50 text-xs mt-0.5">{s.parent_name || '-'}</p>
            </div>
            {s.parent_phone
              ? <a href={`tel:${s.parent_phone}`} className="text-[#0369a1] font-mono text-sm">{s.parent_phone}</a>
              : <span className="text-black/20 text-sm">-</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function InsuranceTab() {
  const supabase = createClient()
  const [students, setStudents] = useState<Row[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  useEffect(() => { supabase.from('students').select('id,name,grade,id_number').order('grade').then(({ data }) => { if (data) setStudents(data) }) }, [])

  function confirm() {
    if (pw === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'david2026')) { setConfirmed(true) }
    else setErr('비밀번호가 틀렸습니다')
  }
  function maskId(id: string) { return id ? id.substring(0, 6) + '-●●●●●●●' : '-' }
  function copyAll() {
    const text = students.filter(s => s.id_number).map(s => `${s.name}(${s.grade}) - ${s.id_number}`).join('\n')
    navigator.clipboard.writeText(text); alert('복사됐습니다!')
  }

  const submitted = students.filter(s => s.id_number).length

  if (!confirmed) return (
    <div className="max-w-sm mx-auto mt-8 space-y-4 text-center">
      <div className="text-4xl mb-2">🔒</div>
      <p className="text-[#0369a1] font-black text-lg">여행자보험</p>
      <p className="text-black/50 text-sm">제출 {submitted}/{students.length}명 완료</p>
      <p className="text-black/40 text-xs">주민번호 포함 민감정보입니다</p>
      <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr('') }}
        onKeyDown={e => e.key === 'Enter' && confirm()}
        className="w-full bg-black/5 rounded-xl px-4 py-3 text-[#0c1a26] text-center outline-none border border-black/10"
        placeholder="비밀번호" />
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button onClick={confirm} className="w-full btn-gold py-3 rounded-xl font-bold">확인</button>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-black/50 text-sm">제출 {submitted}/{students.length}명</p>
        <div className="flex gap-2">
          <button onClick={copyAll} className="btn-gold px-3 py-1.5 rounded-xl text-xs font-bold">전체복사</button>
          <button onClick={() => setConfirmed(false)} className="text-black/30 text-xs px-2">🔒잠금</button>
        </div>
      </div>
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2">
        <p className="text-yellow-400 text-xs">⚠️ 보험 처리 완료 후 즉시 파기하세요</p>
      </div>
      <div className="space-y-2">
        {students.map(s => (
          <div key={s.id} className="card-dark rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[#0c1a26] font-bold text-sm">{s.name} <span className="text-black/30 font-normal text-xs">{getDisplayGrade(s.name, s.grade)}</span></p>
              <p className="font-mono text-sm mt-0.5 text-black/60">
                {s.id_number
                  ? (revealed[s.id] ? <span className="text-[#0369a1]">{s.id_number}</span> : maskId(s.id_number))
                  : <span className="text-black/20">미제출</span>}
              </p>
            </div>
            {s.id_number && (
              <button onClick={() => setRevealed(p => ({ ...p, [s.id]: !p[s.id] }))} className="text-xs text-black/40 hover:text-black/70 px-2 py-1">
                {revealed[s.id] ? '숨기기' : '보기'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="text-center py-12 text-black/30">
      <p className="text-lg">🌿</p>
      <p className="mt-2 text-sm">{text}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  )
}

function AssignmentTab() {
  const [view, setView] = useState<'room' | 'class'>('room')

  const ROOMS = [
    { floor: '4층 10인실', count: 9, teacher: '보조쌤', students: [
      { grade: '6학년 5명', names: '이세영 이하빈 허시은 임지율 홍윤서' },
      { grade: '보조쌤 4명', names: '성은진 신다은 이하원 전지연' },
    ]},
    { floor: '4층 4인실', count: 3, teacher: '이보람', students: [
      { grade: '1학년 2명', names: '오다은 이하연' },
    ]},
    { floor: '4층 4인실', count: 4, teacher: '이정현', students: [
      { grade: '3학년 2명', names: '박송주 전예임' },
      { grade: '5학년 1명', names: '전하임' },
    ]},
    { floor: '4층 4인실', count: 4, teacher: '나미애', students: [
      { grade: '3학년 1명', names: '박라엘' },
      { grade: '4학년 1명', names: '강하윤' },
      { grade: '5학년 1명', names: '한채원' },
    ]},
    { floor: '4층 4인실', count: 3, teacher: '이지연', students: [
      { grade: '5학년 3명', names: '우채은 기연우' },
    ]},
    { floor: '3층 4인실', count: 4, teacher: '부장님', students: [
      { grade: '1학년 1명', names: '이정원' },
      { grade: '2학년 2명', names: '우지호 이시호' },
    ]},
    { floor: '3층 4인실', count: 4, teacher: '김인혁', students: [
      { grade: '3학년 3명', names: '기은우 엄시온 조경주' },
    ]},
    { floor: '3층 큰방', count: 11, teacher: '목사님 · 노성우', students: [
      { grade: '4학년 3명', names: '강민준 오한율 최지원' },
      { grade: '5학년 3명', names: '신재하 박종건 신다겸' },
      { grade: '6학년 3명', names: '이민형 최주완 박시원' },
    ]},
    { floor: '3층 4인실', count: null as number | null, teacher: '주방팀', students: [] },
  ]

  const CLASSES = [
    { teacher: '이보람', assistant: '이하원', desc: '저학년 여 5명', names: '오다은, 이하연, 박송주, 박라엘, 전예임' },
    { teacher: '나미애', assistant: '신다은', desc: '저학년 남 6명', names: '이정원, 우지호, 이시호, 기은우, 엄시온, 조경주' },
    { teacher: '이지연', assistant: '전지연', desc: '4,5학년 여 5명', names: '우채은, 기연우, 한채원, 강하윤, 전하임' },
    { teacher: '노성우', assistant: '성은진', desc: '4,5학년 남 5명', names: '오한율, 최지원, 박종건, 신다겸, 신재하' },
    { teacher: '김인혁', assistant: '고은진', desc: '4,6학년 남 4명', names: '강민준, 이민형(민형 사촌 4학년), 박시원, 최주완' },
    { teacher: '이정현', assistant: '', desc: '6학년 여 5명', names: '이세영, 이하빈, 임지율, 허시은, 홍윤서' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setView('room')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${view === 'room' ? 'bg-[#0369a1] text-white' : 'bg-black/5 text-black/50'}`}>
          🛏️ 방배정
        </button>
        <button onClick={() => setView('class')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${view === 'class' ? 'bg-[#0369a1] text-white' : 'bg-black/5 text-black/50'}`}>
          📚 공과반
        </button>
      </div>

      {view === 'room' && (
        <div className="space-y-3">
          <p className="text-black/40 text-xs text-center">총 아이들 30명 · 방 문 앞에 방 이름 명단 붙여두기</p>
          {ROOMS.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/8 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#0369a1] text-sm">{r.floor}</span>
                  {r.count && <span className="text-black/40 text-xs ml-2">총 {r.count}명</span>}
                </div>
                <span className="bg-[#0c2a4a]/10 text-[#0c2a4a] text-xs font-bold px-2.5 py-1 rounded-full">{r.teacher}</span>
              </div>
              {r.students.map((s, j) => (
                <div key={j} className="pl-2 border-l-2 border-[#d4a843]/40">
                  <span className="text-black/40 text-xs">{s.grade} </span>
                  <span className="text-black/70 text-sm font-medium">{s.names}</span>
                </div>
              ))}
              {r.students.length === 0 && <p className="text-black/30 text-sm pl-2">-</p>}
            </div>
          ))}
        </div>
      )}

      {view === 'class' && (
        <div className="space-y-3">
          {CLASSES.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/8 p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0369a1] text-sm">{c.teacher}</span>
                {c.assistant && <span className="text-black/40 text-xs">· 보조 {c.assistant}</span>}
              </div>
              <p className="text-black/40 text-xs">{c.desc}</p>
              <p className="text-black/70 text-sm leading-relaxed">{c.names}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AttendanceTab() {
  const supabase = createClient()
  const [students, setStudents] = useState<Row[]>([])
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('attendance_checked') || '{}') } catch { return {} }
  })
  const [session, setSession] = useState(() => {
    try { return localStorage.getItem('attendance_session') || '' } catch { return '' }
  })

  useEffect(() => {
    supabase.from('students').select('id, name, grade').order('grade').then(({ data }) => {
      if (data) setStudents(data)
    })
  }, [])

  function toggle(id: number) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem('attendance_checked', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function reset() {
    if (!confirm('인원 체크를 모두 초기화할까요?')) return
    const label = new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    setChecked({})
    setSession(label)
    try {
      localStorage.setItem('attendance_checked', '{}')
      localStorage.setItem('attendance_session', label)
    } catch {}
  }

  const total = students.length
  const present = students.filter(s => checked[s.id]).length

  const gradeOrder = ['초1','초2','초3','초4','초5','초6','선생님','봉사자']
  const grouped = gradeOrder.map(g => ({
    grade: g,
    list: students.filter(s => s.grade === g)
  })).filter(g => g.list.length > 0)

  return (
    <div className="space-y-4">
      <div className="bg-[#0369a1] rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/60 text-xs mb-0.5">{session ? `체크 시작: ${session}` : '인원 체크'}</p>
            <p className="font-black text-3xl leading-none">{present} <span className="text-white/50 text-lg font-normal">/ {total}명</span></p>
          </div>
          <button onClick={reset}
            className="bg-white/20 active:scale-95 transition-all text-white text-xs font-bold px-4 py-2.5 rounded-xl">
            인원체크 새로 시작
          </button>
        </div>
      </div>

      {grouped.map(({ grade, list }) => (
        <div key={grade}>
          <p className="text-black/40 text-xs font-bold mb-2 px-1">{grade} ({list.length}명)</p>
          <div className="grid grid-cols-3 gap-2">
            {list.map(s => (
              <button key={s.id} onClick={() => toggle(s.id)}
                className={`flex flex-col items-center justify-center rounded-2xl px-2 py-3 transition-all active:scale-[0.96] border ${
                  checked[s.id]
                    ? 'bg-[#0369a1] border-[#0369a1] text-white'
                    : 'bg-white border-black/8 text-black/70'
                }`}>
                <span className={`text-lg mb-0.5 ${checked[s.id] ? 'opacity-100' : 'opacity-20'}`}>✅</span>
                <span className="font-bold text-sm text-center leading-tight">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const RATING_VAL = ['매우 좋음', '좋음', '보통', '아쉬움', '매우 아쉬움']
const RATING_COLOR: Record<string, string> = { '매우 좋음': '#0369a1', '좋음': '#0284c7', '보통': '#94a3b8', '아쉬움': '#f59e0b', '매우 아쉬움': '#ef4444' }

const Q_LABELS: Record<string, string> = {
  venue_overall: '장소 전반', venue_room: '숙소(방)', venue_facility: '시설 전반',
  prog_curriculum: "팻머스 '다윗' 커리큘럼", prog_adventure: '다윗 어드벤처', prog_worship: '저녁 예배', prog_celebration: '셀러브레이션',
  prog_pool: '수영장', prog_morning: '기상 미션', prog_class: '공과 시간',
  meal_dinner: '첫날 저녁', meal_snack: '야식', meal_breakfast: '둘째날 아침', meal_lunch: '둘째날 점심',
}

function SurveyResultTab() {
  const supabase = createClient()
  const [results, setResults] = useState<Row[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('announcements').select('id, content, created_at')
      .eq('title', '__survey_2026__').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setResults(data.map(r => ({ id: r.id, created_at: r.created_at, ...JSON.parse(r.content) })))
        setLoading(false)
      })
  }, [])

  function avgRating(key: string) {
    const vals = results.map(r => RATING_VAL.indexOf(r[key])).filter(v => v >= 0)
    if (!vals.length) return null
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return RATING_VAL[Math.round(avg)]
  }

  if (loading) return <p className="text-center text-black/30 py-10">불러오는 중...</p>

  if (results.length === 0) return (
    <div className="text-center py-16 space-y-2">
      <div className="text-4xl">📋</div>
      <p className="text-black/40 text-sm">아직 제출된 설문이 없습니다</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-black text-[#0369a1] text-lg">설문 결과</p>
        <span className="bg-[#0369a1]/10 text-[#0369a1] text-xs font-bold px-3 py-1 rounded-full">{results.length}명 제출</span>
      </div>
      <div className="bg-white rounded-2xl border border-black/8 p-4 space-y-3">
        <p className="font-bold text-sm text-black/60">📊 항목별 평균</p>
        <div className="space-y-2">
          {Object.entries(Q_LABELS).map(([key, label]) => {
            const avg = avgRating(key)
            return avg ? (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-black/50">{label}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: RATING_COLOR[avg] + '20', color: RATING_COLOR[avg] }}>{avg}</span>
              </div>
            ) : null
          })}
        </div>
      </div>
      <p className="font-bold text-sm text-black/50 px-1">개별 응답</p>
      {results.map((r, i) => (
        <div key={r.id}>
          <button onClick={() => setSelected(selected === i ? null : i)}
            className="w-full bg-white rounded-2xl border border-black/8 px-4 py-3.5 flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="text-left">
              <p className="font-bold text-[#0c1a26] text-sm">익명 응답</p>
              <p className="text-black/30 text-xs">{new Date(r.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <span className="text-black/30 text-xs">{selected === i ? '▲' : '▼'}</span>
          </button>
          {selected === i && (
            <div className="bg-white border border-black/8 border-t-0 rounded-b-2xl px-4 pb-4 space-y-3 -mt-2 pt-3">
              {Object.entries(Q_LABELS).map(([key, label]) => r[key] ? (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-black/50">{label}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: RATING_COLOR[r[key]] + '20', color: RATING_COLOR[r[key]] }}>{r[key]}</span>
                </div>
              ) : null)}
              {r.good && <div className="pt-2 border-t border-black/5"><p className="text-xs text-black/40 mb-1">👍 좋았던 점</p><p className="text-sm text-black/70">{r.good}</p></div>}
              {r.bad && <div className="pt-2 border-t border-black/5"><p className="text-xs text-black/40 mb-1">😅 아쉬웠던 점</p><p className="text-sm text-black/70">{r.bad}</p></div>}
              {r.suggest && <div className="pt-2 border-t border-black/5"><p className="text-xs text-black/40 mb-1">💡 개선 사항</p><p className="text-sm text-black/70">{r.suggest}</p></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
