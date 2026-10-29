"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const ADMIN_PW = 'kccc2026'
const ADMIN_KEY = 'forum_admin_auth'

function setCookie(k: string, v: string) {
  const exp = new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString()
  document.cookie = `${k}=${encodeURIComponent(v)}; expires=${exp}; path=/`
}
function getCookie(k: string) {
  const m = document.cookie.split('; ').find(c => c.startsWith(k + '='))
  return m ? decodeURIComponent(m.split('=')[1]) : null
}
function checkAdminAuth() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ADMIN_KEY) === ADMIN_PW || getCookie(ADMIN_KEY) === ADMIN_PW
}
function saveAdminAuth() {
  localStorage.setItem(ADMIN_KEY, ADMIN_PW)
  setCookie(ADMIN_KEY, ADMIN_PW)
}
function clearAdminAuth() {
  localStorage.removeItem(ADMIN_KEY)
  document.cookie = `${ADMIN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

type Reg = {
  id: string; name: string; cohort: string; district: string; campus: string; phone: string
  attending: boolean | null; absent_reason?: string; attendance_type?: string
  transportation?: string; room_note?: string; gender?: string; id_number?: string
  questions?: string; registered_at: string
  fee_paid?: boolean; attended?: boolean; room_number?: string; key_taken?: boolean
  fee_exempt?: boolean
}

type Settings = Record<string, string>

const TABS = ['등록', '참가자 목록', '공지사항', '설문 데이터', '여행자보험', '호실 배정', '식사 주문', '설정']
const TAB_ICONS = ['✅', '👥', '📢', '📊', '🔒', '🛏️', '🍽️', '⚙️']

/* Light theme tokens */
const C = {
  pageBg: '#f5f3ff',
  cardBg: '#ffffff',
  headerBg: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  purple: '#7c5cfc',
  purpleLight: '#ede9fe',
  purpleMid: 'rgba(124,92,252,0.15)',
  cyan: '#4dd9ff',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  inputBg: '#f9fafb',
}

export default function ForumPortalAdmin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam === 'settings') setActiveTab(7)
    if (checkAdminAuth()) setAuthed(true)
  }, [])

  function login() {
    if (pw === ADMIN_PW) { saveAdminAuth(); setAuthed(true) }
    else setPwError('비밀번호가 틀렸습니다')
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.pageBg }}>
        <div className="w-full max-w-sm rounded-3xl p-8 space-y-5" style={{ background: C.cardBg, boxShadow: '0 8px 40px rgba(124,92,252,0.15)', border: `1px solid ${C.border}` }}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: C.purpleLight }}>
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="font-black text-xl" style={{ color: C.purple }}>포럼 관리자</h1>
            <p className="text-xs mt-1" style={{ color: C.textMuted }}>2026 CCC 교육간사 포럼</p>
          </div>
          <input value={pw} onChange={e => { setPw(e.target.value); setPwError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            type="password" placeholder="비밀번호"
            className="w-full rounded-xl px-4 py-3 text-center text-lg tracking-widest outline-none text-base"
            style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.textPrimary }} />
          {pwError && <p className="text-red-500 text-xs text-center">{pwError}</p>}
          <button onClick={login} className="w-full py-4 rounded-2xl font-bold text-white"
            style={{ background: `linear-gradient(135deg,${C.purple},${C.cyan})` }}>
            입장
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: C.pageBg }}>
      {/* Header */}
      <div style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.purpleLight }}>
              <span className="text-base">⚙️</span>
            </div>
            <div>
              <h1 className="font-black text-sm" style={{ color: C.purple }}>2026 교육간사 포럼 관리</h1>
              <p className="text-xs" style={{ color: C.textMuted }}>11월 23-24일 · 수원 CCC 회관</p>
            </div>
          </div>
          <button onClick={() => { clearAdminAuth(); window.location.href = '/forum' }}
            className="text-xs px-3 py-2 rounded-lg font-medium"
            style={{ background: C.inputBg, color: C.textSecondary, border: `1px solid ${C.border}` }}>
            로그아웃
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex overflow-x-auto" style={{ maxWidth: 1400, margin: '0 auto' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)}
              className="flex-shrink-0 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all"
              style={{
                minWidth: 90,
                color: activeTab === i ? C.purple : C.textMuted,
                borderBottom: activeTab === i ? `2px solid ${C.purple}` : '2px solid transparent',
                background: 'transparent',
              }}>
              {TAB_ICONS[i]} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px' }}>
        {activeTab === 0 && <CheckInTab />}
        {activeTab === 1 && <RegistrationsTab />}
        {activeTab === 2 && <NoticesTab />}
        {activeTab === 3 && <SurveyDataTab />}
        {activeTab === 4 && <InsuranceTab />}
        {activeTab === 5 && <RoomsTab />}
        {activeTab === 6 && <MealTab />}
        {activeTab === 7 && <SettingsTab />}
      </div>
    </div>
  )
}

/* ─────────────── Tab: Notices ─────────────── */
// Supabase SQL (run once in Supabase SQL editor):
// create table forum_notices (
//   id uuid primary key default gen_random_uuid(),
//   title text not null,
//   content text,
//   active boolean default true,
//   created_at timestamptz default now()
// );
type Notice = { id: string; title: string; content: string; active: boolean; created_at: string }

function NoticesTab() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const r = await fetch('/api/admin/notices').then(r => r.json())
    setNotices(r.notices || [])
  }
  useEffect(() => { load() }, [])

  async function post(action: string, body: object) {
    const r = await fetch('/api/admin/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) })
    return r.json()
  }

  async function add() {
    if (!title.trim()) return
    setSaving(true)
    await post('create', { title: title.trim(), content: content.trim() })
    setTitle(''); setContent('')
    await load()
    setSaving(false); setMsg('등록됨'); setTimeout(() => setMsg(''), 2000)
  }

  async function toggle(n: Notice) {
    await post('toggle', { id: n.id, active: !n.active })
    await load()
  }

  async function del(id: string) {
    if (!confirm('삭제할까요?')) return
    await post('delete', { id })
    await load()
  }

  const IB = `w-full rounded-xl px-3 py-3 outline-none text-sm`

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 space-y-3" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <p className="font-bold text-sm" style={{ color: C.textPrimary }}>📢 공지사항 등록</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 (필수)"
          className={IB} style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.textPrimary }} />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용 (선택)"
          rows={3} className={IB} style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.textPrimary, resize: 'none' }} />
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={saving || !title.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: C.purple }}>{saving ? '등록 중...' : '등록하기'}</button>
          {msg && <span className="text-sm font-bold" style={{ color: C.green }}>{msg}</span>}
        </div>
      </div>

      <div className="space-y-3">
        {notices.length === 0 && <p className="text-center py-8 text-sm" style={{ color: C.textMuted }}>등록된 공지사항이 없습니다</p>}
        {notices.map(n => (
          <div key={n.id} className="rounded-2xl p-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: C.textPrimary }}>{n.title}</p>
                {n.content && <p className="text-xs mt-1 leading-relaxed" style={{ color: C.textSecondary }}>{n.content}</p>}
                <p className="text-xs mt-1.5" style={{ color: C.textMuted }}>{new Date(n.created_at).toLocaleString('ko-KR')}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(n)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: n.active ? '#dcfce7' : C.inputBg, color: n.active ? '#16a34a' : C.textMuted, border: `1px solid ${n.active ? '#bbf7d0' : C.border}` }}>
                  {n.active ? '활성' : '비활성'}
                </button>
                <button onClick={() => del(n.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#fef2f2', color: C.red, border: `1px solid #fecaca` }}>삭제</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function isSlmhq(r: Reg) {
  const n = (s: string) => (s || '').toLowerCase().replace(/\s/g, '')
  const has = (s: string) => n(s).includes('slm') && n(s).includes('hq')
  return has(r.campus) || has(r.name) || has(r.district)
}

/* ─────────────── Tab 0: Registrations (basic info) ─────────────── */
function RegistrationsTab() {
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAttending, setFilterAttending] = useState(false)

  useEffect(() => {
    fetch('/api/admin/registrations').then(r => r.json())
      .then(d => { setRegs(d.registrations || []); setLoading(false) })
  }, [])

  function exportCSV() {
    const rows = [['이름','기수','지구','캠퍼스','성별','연락처','참석여부','등록일']]
    regs.forEach(r => rows.push([r.name, r.cohort + '기', r.district, r.campus,
      r.gender || '', r.phone, r.attending ? '참석' : '불참', r.registered_at?.slice(0,10) || '']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type: 'text/csv' })); a.download = '포럼참가자.csv'; a.click()
  }

  const sorted = [...regs].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  const displayed = filterAttending ? sorted.filter(r => r.attending === true) : sorted
  const total = regs.length
  const attending = regs.filter(r => r.attending === true).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[['전체', total, C.purple], ['참석', attending, C.cyan]].map(([l, n, c]) => (
          <div key={l as string} className="rounded-2xl p-4 text-center" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <p className="font-black text-2xl" style={{ color: c as string }}>{n as number}</p>
            <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{l as string}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setFilterAttending(false)}
            className="px-3 py-2 rounded-lg text-xs font-bold"
            style={{ background: !filterAttending ? C.purple : C.purpleLight, color: !filterAttending ? 'white' : C.purple }}>전체</button>
          <button onClick={() => setFilterAttending(true)}
            className="px-3 py-2 rounded-lg text-xs font-bold"
            style={{ background: filterAttending ? C.purple : C.purpleLight, color: filterAttending ? 'white' : C.purple }}>참석자만</button>
        </div>
        <button onClick={exportCSV} className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: C.inputBg, color: C.textSecondary, border: `1px solid ${C.border}` }}>CSV 내보내기</button>
      </div>
      {loading ? <p className="text-center py-8" style={{ color: C.textMuted }}>불러오는 중...</p> : (
        <div className="overflow-x-auto rounded-2xl" style={{ background: C.cardBg, border: `1px solid ${C.border}`, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <table className="w-full text-xs" style={{ minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.inputBg }}>
                {['이름','기수','지구','캠퍼스','성별','연락처','참석'].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-bold whitespace-nowrap" style={{ color: C.textSecondary }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td className="px-3 py-2.5 font-bold whitespace-nowrap" style={{ color: C.textPrimary }}>{r.name}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: C.textSecondary }}>{r.cohort}기</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: C.textSecondary }}>{r.district}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: C.textSecondary }}>{r.campus}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: C.textSecondary }}>{r.gender || '-'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: C.textSecondary }}>{r.phone}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: r.attending ? 'rgba(77,217,255,0.15)' : '#fef2f2', color: r.attending ? '#0891b2' : C.red }}>
                      {r.attending ? '참석' : '불참'}
                    </span>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10" style={{ color: C.textMuted }}>등록자가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Tab 0: Check-in ─────────────── */
function CheckInTab() {
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch('/api/admin/registrations').then(r => r.json())
      .then(d => { setRegs(d.registrations || []); setLoading(false) })
  }, [])


  async function patch(id: string, updates: Partial<Reg>) {
    setSaving(id)
    await fetch('/api/admin/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
    setRegs(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    setSaving(null)
  }

  const attendees = regs.filter(r => r.attending === true)
  const q = search.trim()
  const sorted = [...attendees].sort((a, b) => {
    const aMatch = q && a.name.includes(q)
    const bMatch = q && b.name.includes(q)
    if (aMatch && !bMatch) return -1
    if (!aMatch && bMatch) return 1
    return a.name.localeCompare(b.name, 'ko')
  })
  const highlighted = q ? sorted.filter(r => r.name.includes(q)).map(r => r.id) : []

  const feePaid = attendees.filter(r => r.fee_paid).length
  const attended = attendees.filter(r => r.attended).length
  const keyTaken = attendees.filter(r => r.key_taken).length
  const feeActual = attendees.filter(r => r.fee_paid && !isSlmhq(r) && !r.fee_exempt).length
  const feeTotal = feeActual * 50000

  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[['회비납부', feePaid, C.green], ['참석체크', attended, C.cyan], ['키수령', keyTaken, C.amber]].map(([l, n, c]) => (
          <div key={l as string} className="rounded-2xl p-3 text-center" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <p className="font-black text-xl" style={{ color: c as string }}>{n as number}<span className="text-xs font-normal" style={{ color: C.textMuted }}>/{attendees.length}</span></p>
            <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{l as string}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <span className="text-sm font-bold" style={{ color: C.textSecondary }}>💰 납부 회비 합계</span>
        <div className="text-right">
          <span className="font-black text-lg" style={{ color: C.green }}>{feeTotal.toLocaleString()}원</span>
          <span className="text-xs ml-1.5" style={{ color: C.textMuted }}>{feeActual}명 × 50,000원</span>
        </div>
      </div>

      <input value={search} onChange={e => { setSearch(e.target.value); tableContainerRef.current && (tableContainerRef.current.scrollTop = 0) }}
        placeholder="🔍 이름 검색"
        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
        style={{ background: C.cardBg, border: `1px solid ${C.border}`, color: C.textPrimary, boxSizing: 'border-box' as const }} />

      {loading ? <p className="text-center py-8" style={{ color: C.textMuted }}>불러오는 중...</p> : (
        <div ref={tableContainerRef} className="overflow-auto rounded-2xl" style={{ background: C.cardBg, border: `1px solid ${C.border}`, maxHeight: '60vh', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <table className="w-full text-xs" style={{ minWidth: 620 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.inputBg }}>
                {['이름','성별','기수','지구','회비납부','참석체크','호실','키수령'].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-bold whitespace-nowrap" style={{ color: C.textSecondary }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const isHit = highlighted.includes(r.id)
                const staff = isSlmhq(r)
                const exempt = staff || !!r.fee_exempt
                return (
                  <tr key={r.id}
                    style={{ borderBottom: `1px solid ${C.border}`, background: isHit ? 'rgba(124,92,252,0.08)' : undefined, transition: 'background 0.3s' }}>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isHit && <span>👉</span>}
                        <span className="font-bold" style={{ color: isHit ? C.purple : C.textPrimary }}>{r.name}</span>
                        {staff && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: '#f0fdf4', color: '#15803d' }}>스텝</span>
                        )}
                        {!staff && (
                          <button onClick={() => patch(r.id, { fee_exempt: !r.fee_exempt, fee_paid: !r.fee_exempt ? true : r.fee_paid })}
                            disabled={saving === r.id}
                            className="text-xs px-1.5 py-0.5 rounded-md font-bold transition-all"
                            style={{ background: r.fee_exempt ? '#fef9c3' : C.inputBg, color: r.fee_exempt ? '#854d0e' : C.textMuted, border: `1px solid ${r.fee_exempt ? '#fde047' : C.border}` }}>
                            면제
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded-md text-xs font-bold"
                        style={{ background: r.gender === '여성' ? '#fce7f3' : '#eff6ff', color: r.gender === '여성' ? '#be185d' : '#1d4ed8' }}>
                        {r.gender === '여성' ? '여' : '남'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: C.textSecondary }}>{r.cohort}기</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: C.textSecondary }}>{r.district}</td>
                    <td className="px-3 py-2.5">
                      {exempt ? (
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 rounded-md border-2 flex items-center justify-center" style={{ background: '#d1fae5', borderColor: '#6ee7b7' }}>
                            <span className="text-xs font-black" style={{ color: '#059669' }}>✓</span>
                          </div>
                        </div>
                      ) : (
                        <Checkbox checked={!!r.fee_paid} disabled={saving === r.id} onChange={v => patch(r.id, { fee_paid: v })} color={C.green} />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Checkbox checked={!!r.attended} disabled={saving === r.id} onChange={v => patch(r.id, { attended: v })} color={C.cyan} />
                    </td>
                    <td className="px-3 py-2.5">
                      {r.attendance_type === '전 일정(1박 2일) 참석' ? (
                        <input defaultValue={r.room_number || ''} onBlur={e => { if (e.target.value !== (r.room_number || '')) patch(r.id, { room_number: e.target.value }) }}
                          placeholder="호실" className="w-14 rounded-lg px-2 py-1.5 text-xs text-center outline-none"
                          style={{ background: C.purpleLight, border: `1px solid ${C.purpleMid}`, color: C.purple }} />
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>당일참석</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Checkbox checked={!!r.key_taken} disabled={saving === r.id} onChange={v => patch(r.id, { key_taken: v })} color={C.amber} />
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10" style={{ color: C.textMuted }}>참석자가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Tab 2: Survey Data ─────────────── */
function SurveyDataTab() {
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'challenges' | 'absent' | 'detail'>('challenges')

  useEffect(() => {
    fetch('/api/admin/registrations')
      .then(r => r.json())
      .then(d => { setRegs(d.registrations || []); setLoading(false) })
  }, [])

  if (loading) return <p className="text-center py-10" style={{ color: C.textMuted }}>불러오는 중...</p>

  const attendees = regs.filter(r => r.attending === true)
  const absentees = regs.filter(r => r.attending === false)

  const challengeCounts: Record<string, number> = {}
  regs.forEach(r => {
    const raw = (r as unknown as Record<string, unknown>).challenges
    const arr: string[] = Array.isArray(raw) ? raw as string[] : []
    arr.forEach((c: string) => { challengeCounts[c] = (challengeCounts[c] || 0) + 1 })
  })
  const sortedChallenges = Object.entries(challengeCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {([['challenges', '🔥 주요 고민'], ['absent', '😔 불참 사유'], ['detail', '📝 상세 응답']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setView(k)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: view === k ? C.purple : C.purpleLight, color: view === k ? 'white' : C.purple }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'challenges' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <p className="text-sm font-bold mb-4" style={{ color: C.textPrimary }}>🔥 현장 고민 TOP (복수 선택 · {regs.length}명 기준)</p>
            {sortedChallenges.length === 0
              ? <p className="text-center py-4" style={{ color: C.textMuted }}>응답 없음</p>
              : (
                <div style={{ minHeight: 20 }}>
                  <ResponsiveContainer width="100%" height={sortedChallenges.length * 44 + 20} minWidth={0}>
                    <BarChart data={sortedChallenges.map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, full: name, value }))}
                      layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
                      <XAxis type="number" tick={{ fill: C.textMuted, fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={180} tick={{ fill: C.textSecondary, fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: C.purpleLight }}
                        contentStyle={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.textPrimary }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ''}
                        formatter={(v: unknown) => [`${v}명`, '응답수']} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {sortedChallenges.map((_, i) => (
                          <Cell key={i} fill={`hsl(${255 + i * 12}, 70%, ${60 - i * 2}%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </div>

          <div className="rounded-2xl p-5" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <p className="text-sm font-bold mb-3" style={{ color: C.textPrimary }}>📊 참석/불참 현황</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: C.border }}>
                <div className="h-3 rounded-full" style={{ width: `${regs.length ? (attendees.length / regs.length) * 100 : 0}%`, background: `linear-gradient(90deg,${C.purple},${C.cyan})` }} />
              </div>
              <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.textSecondary }}>참석 {attendees.length} / 불참 {absentees.length}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold" style={{ color: C.textPrimary }}>💬 SLM HQ에 하고 싶은 말</p>
            {regs.filter(r => (r as unknown as Record<string,unknown>).questions).length === 0 && (
              <p className="text-center py-4" style={{ color: C.textMuted }}>응답 없음</p>
            )}
            {regs.filter(r => (r as unknown as Record<string,unknown>).questions).map(r => (
              <div key={r.id} className="rounded-xl p-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold mb-1" style={{ color: C.purple }}>{r.name} ({r.cohort}기 · {r.district}) <span style={{ color: C.textMuted }}>{r.attending ? '참석' : '불참'}</span></p>
                <p className="text-sm leading-relaxed" style={{ color: C.textPrimary }}>{String((r as unknown as Record<string,unknown>).questions)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'absent' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: C.textMuted }}>불참 {absentees.length}명</p>
          {absentees.length === 0 && <p className="text-center py-8" style={{ color: C.textMuted }}>불참자 없음</p>}
          {absentees.map(r => (
            <div key={r.id} className="rounded-xl p-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-bold text-sm" style={{ color: C.textPrimary }}>{r.name}</span>
                <span className="text-xs" style={{ color: C.textMuted }}>{r.cohort}기 · {r.district} · {r.campus}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{r.absent_reason || '사유 미작성'}</p>
              {(r as unknown as Record<string,unknown>).questions ? (
                <p className="text-xs mt-2" style={{ color: C.purple }}>💬 {String((r as unknown as Record<string,unknown>).questions)}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {view === 'detail' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: C.textMuted }}>참석자 {attendees.length}명 · 불참자 {absentees.length}명</p>
          {regs.map(r => {
            const extra = r as unknown as Record<string, unknown>
            return (
              <div key={r.id} className="rounded-xl p-4 space-y-2" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black" style={{ color: C.textPrimary }}>{r.name}</span>
                  <span className="text-xs" style={{ color: C.textMuted }}>{r.cohort}기</span>
                  <span className="text-xs" style={{ color: C.textMuted }}>{r.district} · {r.campus}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: r.attending ? 'rgba(14,165,233,0.1)' : '#fef2f2', color: r.attending ? '#0891b2' : C.red }}>
                    {r.attending ? '참석' : '불참'}
                  </span>
                </div>
                {r.attending ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: C.textSecondary }}>
                    <span>📞 {r.phone}</span>
                    <span>🚌 {r.transportation}</span>
                    <span>🗓 {r.attendance_type}</span>
                    <span>🚻 {r.gender}</span>
                    {r.room_note && <span className="col-span-2">🏨 {r.room_note}</span>}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: C.textSecondary }}>불참 사유: {r.absent_reason}</p>
                )}
                {Array.isArray(extra.challenges) && (extra.challenges as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(extra.challenges as string[]).map((c: string) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full" style={{ background: C.purpleLight, color: C.purple }}>{c}</span>
                    ))}
                  </div>
                )}
                {extra.desired_topic ? <p className="text-xs" style={{ color: C.textSecondary }}>기대: {String(extra.desired_topic)}</p> : null}
                {extra.questions ? <p className="text-xs" style={{ color: C.purple }}>💬 {String(extra.questions)}</p> : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────── Tab 3: Insurance ─────────────── */
function InsuranceTab() {
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/registrations')
      .then(r => r.json())
      .then(d => { setRegs((d.registrations || []).filter((r: Reg) => r.attending === true)); setLoading(false) })
  }, [])

  function exportCSV(list: Reg[], filename: string) {
    const rows = [['번호', '이름', '기수', '지구', '캠퍼스', '성별', '주민등록번호']]
    list.forEach((r, i) => rows.push([
      String(i + 1), r.name, r.cohort, r.district, r.campus,
      r.gender || '', r.id_number || ''
    ]))
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = filename; a.click()
  }

  if (loading) return <p className="text-center py-10" style={{ color: C.textMuted }}>불러오는 중...</p>

  const twoDay = regs.filter(r => r.attendance_type === '전 일정(1박 2일) 참석')
  const oneDay = regs.filter(r => r.attendance_type !== '전 일정(1박 2일) 참석')

  function InsuranceTable({ list, label }: { list: Reg[], label: string }) {
    const withoutId = list.filter(r => !r.id_number)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-bold text-sm" style={{ color: C.textPrimary }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{list.length}명 중 {list.filter(r => r.id_number).length}명 제출 · {withoutId.length}명 미제출</p>
          </div>
          <button onClick={() => exportCSV(list, `여행자보험_${label}.csv`)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: C.purple, minHeight: 40 }}>
            CSV 내보내기
          </button>
        </div>
        {withoutId.length > 0 && (
          <div className="rounded-xl p-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: '#92400e' }}>⚠️ 미제출 ({withoutId.length}명)</p>
            <div className="flex flex-wrap gap-1.5">
              {withoutId.map(r => (
                <span key={r.id} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>
                  {r.name} ({r.cohort}기)
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-2xl" style={{ background: C.cardBg, border: `1px solid ${C.border}`, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <table className="w-full text-sm" style={{ minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.inputBg }}>
                {['#', '이름', '기수', '지구', '성별', '주민등록번호'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-bold whitespace-nowrap" style={{ color: C.textSecondary }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td className="px-3 py-2.5 text-xs" style={{ color: C.textMuted }}>{i + 1}</td>
                  <td className="px-3 py-2.5 font-bold text-xs whitespace-nowrap" style={{ color: C.textPrimary }}>{r.name}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: C.textSecondary }}>{r.cohort}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.textSecondary }}>{r.district}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: C.textSecondary }}>{r.gender || '-'}</td>
                  <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap" style={{ color: r.id_number ? C.purple : C.red }}>
                    {r.id_number || '미제출'}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-xs" style={{ color: C.textMuted }}>해당 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-lg" style={{ color: C.textPrimary }}>🔒 여행자보험 주민번호 수합</h2>
      <InsuranceTable list={twoDay} label="🏨 1박 2일 참석자" />
      <InsuranceTable list={oneDay} label="☀️ 당일 참석자" />
    </div>
  )
}

/* ─────────────── Tab 4: Rooms ─────────────── */
function RoomsTab() {
  const [regs, setRegs] = useState<Reg[]>([])
  const [rooms, setRooms] = useState<Record<string, string>>({})
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function load() {
      const [rr, sr] = await Promise.all([
        fetch('/api/admin/registrations').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json()),
      ])
      const list: Reg[] = (rr.registrations || []).filter((r: Reg) => r.attending === true && r.attendance_type === '전 일정(1박 2일) 참석')
      setRegs(list)
      const init: Record<string, string> = {}
      list.forEach((r: Reg) => { init[r.id] = r.room_number || '' })
      setRooms(init)
      setPublished(sr.settings?.rooms_published === 'true')
    }
    load()
  }, [])

  async function saveAll() {
    setSaving(true)
    await Promise.all(Object.entries(rooms).map(([id, room_number]) =>
      fetch('/api/admin/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, room_number }) })
    ))
    setSaving(false)
    setMsg('저장됨')
    setTimeout(() => setMsg(''), 2000)
  }

  async function publish(v: boolean) {
    setSaving(true)
    await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'rooms_published', value: v ? 'true' : null }) })
    setPublished(v)
    setSaving(false)
  }

  const grouped: Record<string, string[]> = {}
  regs.forEach(r => {
    const room = rooms[r.id] || '미배정'
    if (!grouped[room]) grouped[room] = []
    grouped[room].push(r.name)
  })

  return (
    <div className="space-y-4">
      <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#eff6ff', color: '#1d4ed8' }}>🏨 1박 2일 참석자만 표시 (당일 참석자는 호실 배정 불필요)</p>
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={saveAll} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: C.purple, minHeight: 44 }}>
          {saving ? '저장 중...' : '전체 저장'}
        </button>
        {msg && <span className="text-sm font-bold" style={{ color: C.green }}>{msg}</span>}
        <div className="flex gap-2 ml-auto flex-wrap">
          <button onClick={() => publish(true)} disabled={published || saving}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: published ? C.green : '#16a34a', minHeight: 44 }}>
            {published ? '✓ 공지됨' : '배정 공지하기'}
          </button>
          {published && (
            <button onClick={() => publish(false)} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#fef2f2', color: C.red, border: `1px solid #fecaca`, minHeight: 44 }}>
              공지 취소
            </button>
          )}
        </div>
      </div>

      {(['남성', '여성'] as const).map(gender => {
        const group = regs.filter(r => (r.gender === gender) || (gender === '남성' && r.gender !== '여성'))
        if (group.length === 0) return null
        return (
          <div key={gender}>
            <p className="text-xs font-bold mb-2 px-1" style={{ color: gender === '여성' ? '#be185d' : '#1d4ed8' }}>
              {gender === '여성' ? '👩 여성' : '👨 남성'} ({group.length}명)
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: C.cardBg, border: `1px solid ${gender === '여성' ? '#fce7f3' : '#eff6ff'}` }}>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm" style={{ color: C.textPrimary }}>{r.name}</span>
                    <span className="text-xs font-bold ml-2" style={{ color: C.textMuted }}>{r.cohort}기 · {r.district}</span>
                  </div>
                  <input value={rooms[r.id] || ''} onChange={e => setRooms(prev => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="호실 입력" className="w-24 rounded-lg px-3 py-2 text-sm text-center outline-none font-bold"
                    style={{ background: gender === '여성' ? '#fce7f3' : '#eff6ff', border: `1px solid ${gender === '여성' ? '#fbcfe8' : '#bfdbfe'}`, color: gender === '여성' ? '#be185d' : '#1d4ed8' }} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {Object.keys(grouped).length > 0 && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold" style={{ color: C.textSecondary }}>호실별 배정 미리보기</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(grouped).sort().map(([room, names]) => (
              <div key={room} className="flex items-start gap-3 rounded-xl px-3 py-2" style={{ background: C.inputBg }}>
                <span className="font-black text-sm shrink-0" style={{ color: room === '미배정' ? C.red : C.purple, minWidth: '3rem' }}>{room}</span>
                <span className="text-sm" style={{ color: C.textSecondary }}>{names.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Tab 5: Meals ─────────────── */
function MealTab() {
  const [menuText, setMenuText] = useState('')
  const [orderStart, setOrderStart] = useState('')
  const [orderEnd, setOrderEnd] = useState('')
  const [active, setActive] = useState(false)
  const [orders, setOrders] = useState<{ id: string; name: string; menu_item: string; created_at: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function load() {
      const [sr, or] = await Promise.all([
        fetch('/api/admin/settings').then(r => r.json()),
        fetch('/api/meal-order').then(r => r.json()),
      ])
      const s = sr.settings || {}
      if (s.meal_menu) {
        try { setMenuText(JSON.parse(s.meal_menu).join('\n')) } catch { setMenuText('') }
      }
      setOrderStart(s.meal_order_start || '')
      setOrderEnd(s.meal_order_end || '')
      setActive(s.meal_order_active === 'true')
      setOrders(or.orders || [])
    }
    load()
  }, [])

  async function saveSetting(key: string, value: string | null) {
    await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) })
  }

  async function saveMenu() {
    setSaving(true)
    const items = menuText.split('\n').map(s => s.trim()).filter(Boolean)
    await saveSetting('meal_menu', JSON.stringify(items))
    setSaving(false); setMsg('저장됨'); setTimeout(() => setMsg(''), 2000)
  }

  async function publishOrder() {
    setSaving(true)
    await Promise.all([
      saveSetting('meal_order_start', orderStart),
      saveSetting('meal_order_end', orderEnd),
      saveSetting('meal_order_active', 'true'),
    ])
    setActive(true); setSaving(false); setMsg('공지됨'); setTimeout(() => setMsg(''), 2000)
  }

  async function cancelOrder() {
    setSaving(true)
    await saveSetting('meal_order_active', null)
    setActive(false); setSaving(false)
  }

  const menuCounts: Record<string, number> = {}
  orders.forEach(o => { menuCounts[o.menu_item] = (menuCounts[o.menu_item] || 0) + 1 })

  return (
    <div className="space-y-4" style={{ maxWidth: 700 }}>
      <div className="rounded-2xl p-5 space-y-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <p className="font-bold text-sm" style={{ color: C.textPrimary }}>메뉴 목록 (한 줄에 하나씩)</p>
        <textarea value={menuText} onChange={e => setMenuText(e.target.value)} rows={5}
          placeholder={'갈비탕\n비빔밥\n된장찌개'}
          className="w-full rounded-xl px-4 py-3 outline-none resize-none text-base"
          style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.textPrimary }} />
        <div className="flex items-center gap-3">
          <button onClick={saveMenu} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: C.purple, minHeight: 44 }}>
            메뉴 저장
          </button>
          {msg && <span className="text-sm font-bold" style={{ color: C.green }}>{msg}</span>}
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <p className="font-bold text-sm" style={{ color: C.textPrimary }}>주문 받을 시간</p>
        <div className="space-y-3" style={{ minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <label className="text-xs mb-1.5 block" style={{ color: C.textSecondary }}>시작</label>
            <div style={{ overflow: 'hidden', borderRadius: 12, border: `1px solid ${C.border}`, background: C.inputBg }}>
              <input type="datetime-local" value={orderStart} onChange={e => setOrderStart(e.target.value)}
                style={{ width: '100%', minWidth: 0, padding: '10px 12px', outline: 'none', border: 'none', background: 'transparent', color: C.textPrimary, fontSize: 14, boxSizing: 'border-box' as const }} />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <label className="text-xs mb-1.5 block" style={{ color: C.textSecondary }}>종료</label>
            <div style={{ overflow: 'hidden', borderRadius: 12, border: `1px solid ${C.border}`, background: C.inputBg }}>
              <input type="datetime-local" value={orderEnd} onChange={e => setOrderEnd(e.target.value)}
                style={{ width: '100%', minWidth: 0, padding: '10px 12px', outline: 'none', border: 'none', background: 'transparent', color: C.textPrimary, fontSize: 14, boxSizing: 'border-box' as const }} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={publishOrder} disabled={saving || !orderStart || !orderEnd}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: active ? C.green : '#16a34a', minHeight: 44 }}>
            {active ? '✓ 주문 공지 중' : '주문 공지하기'}
          </button>
          {active && (
            <button onClick={cancelOrder} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#fef2f2', color: C.red, border: `1px solid #fecaca`, minHeight: 44 }}>
              주문 취소
            </button>
          )}
        </div>
      </div>

      {orders.length > 0 && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-bold text-sm" style={{ color: C.textPrimary }}>주문 현황 ({orders.length}건)</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(menuCounts).map(([item, cnt]) => (
                <span key={item} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: C.purpleLight, color: C.purple }}>{item} {cnt}건</span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <table className="w-full text-sm" style={{ minWidth: 300 }}>
              <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: C.inputBg }}>
                {['이름','메뉴','시간'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-bold" style={{ color: C.textSecondary }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td className="px-3 py-2" style={{ color: C.textPrimary }}>{o.name}</td>
                    <td className="px-3 py-2" style={{ color: C.textSecondary }}>{o.menu_item}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: C.textMuted }}>{new Date(o.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Tab 6: Settings ─────────────── */
function SettingsTab() {
  const [regOpen, setRegOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const todayKST = () => new Date().toLocaleDateString('sv', { timeZone: 'Asia/Seoul' })

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      const s = d.settings || {}
      setRegOpen(s.reg_open_override === todayKST())
    })
  }, [])

  async function toggleRegOpen(v: boolean) {
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'reg_open_override', value: v ? todayKST() : null })
    })
    setRegOpen(v)
    setSaving(false)
  }

  return (
    <div className="space-y-4" style={{ maxWidth: 420 }}>
      <div className="rounded-2xl p-6 space-y-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>등록 오픈</p>
          <p className="text-sm" style={{ color: C.textSecondary }}>마감일(11월 15일) 이후에도 오늘 하루 등록 가능하게 열기</p>
        </div>
        <button onClick={() => toggleRegOpen(!regOpen)} disabled={saving}
          className="w-full py-5 rounded-2xl font-black text-xl text-white transition-all disabled:opacity-40"
          style={{
            background: regOpen ? `linear-gradient(135deg,${C.green},${C.cyan})` : `linear-gradient(135deg,${C.purple},#a78bfa)`,
            boxShadow: regOpen ? `0 4px 24px rgba(34,197,94,0.35)` : `0 4px 24px rgba(124,92,252,0.35)`,
          }}>
          {saving ? '처리 중...' : regOpen ? '🟢 오픈 중' : '🔴 닫힘'}
        </button>
        <p className="text-xs text-center" style={{ color: C.textMuted }}>당일 자정(00:00)에 자동으로 닫힙니다</p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <p className="text-xs" style={{ color: C.textMuted }}>등록 마감일: <span style={{ color: C.textSecondary }}>2026년 11월 15일</span></p>
        <p className="text-xs mt-1" style={{ color: C.textMuted }}>문의: 김양연 간사 010-9154-6113</p>
      </div>
    </div>
  )
}

/* ─────────────── Checkbox ─────────────── */
function Checkbox({ checked, onChange, disabled, color }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; color?: string }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all disabled:opacity-40"
      style={{ background: checked ? (color || C.purple) : 'white', borderColor: checked ? (color || C.purple) : C.border }}>
      {checked && <span className="text-white text-xs font-black">✓</span>}
    </button>
  )
}
