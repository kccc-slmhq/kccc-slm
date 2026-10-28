"use client"

import React, { useState, useEffect, useCallback } from 'react'

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
}

type Settings = Record<string, string>

const TABS = ['참가자 목록', '호실 배정', '식사 주문', '설정']
const TAB_ICONS = ['👥', '🛏️', '🍽️', '⚙️']

export default function ForumPortalAdmin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam === 'settings') setActiveTab(3)
    if (checkAdminAuth()) setAuthed(true)
  }, [])

  function login() {
    if (pw === ADMIN_PW) { saveAdminAuth(); setAuthed(true) }
    else setPwError('비밀번호가 틀렸습니다')
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f0830' }}>
        <div className="w-full max-w-sm rounded-3xl p-8 space-y-5" style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }}>
          <h1 className="text-center font-black text-xl" style={{ background: 'linear-gradient(90deg,#4dd9ff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            포럼 관리자
          </h1>
          <input value={pw} onChange={e => { setPw(e.target.value); setPwError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            type="password" placeholder="비밀번호"
            className="w-full rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest outline-none text-base"
            style={{ background: 'rgba(124,92,252,0.2)', border: '1px solid rgba(124,92,252,0.4)' }} />
          {pwError && <p className="text-red-400 text-xs text-center">{pwError}</p>}
          <button onClick={login} className="w-full py-4 rounded-2xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7c5cfc,#4dd9ff)' }}>
            입장
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0830' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#1a0f3a', borderBottom: '1px solid rgba(124,92,252,0.2)' }}>
        <div>
          <h1 className="font-black text-base" style={{ color: '#a78bfa' }}>2026 교육간사 포럼 관리</h1>
          <p className="text-white/40 text-xs">11월 23-24일 · 수원 CCC 회관</p>
        </div>
        <button onClick={() => { clearAdminAuth(); window.location.href = '/forum' }}
          className="text-white/30 text-xs px-3 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          로그아웃
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto" style={{ background: '#1a0f3a', borderBottom: '1px solid rgba(124,92,252,0.15)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className="flex-1 min-w-[80px] px-3 py-3 text-xs font-bold whitespace-nowrap transition-all"
            style={{ color: activeTab === i ? '#a78bfa' : 'rgba(255,255,255,0.35)', borderBottom: activeTab === i ? '2px solid #7c5cfc' : '2px solid transparent' }}>
            {TAB_ICONS[i]} {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 0 && <RegistrationsTab />}
        {activeTab === 1 && <RoomsTab />}
        {activeTab === 2 && <MealTab />}
        {activeTab === 3 && <SettingsTab />}
      </div>
    </div>
  )
}

/* ─────────────── Tab 1: Registrations ─────────────── */
function RegistrationsTab() {
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAttending, setFilterAttending] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/registrations')
    if (r.ok) { const d = await r.json(); setRegs(d.registrations || []) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function patch(id: string, updates: Partial<Reg>) {
    setSaving(id)
    await fetch('/api/admin/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
    setRegs(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    setSaving(null)
  }

  function exportCSV() {
    const rows = [['이름','기수','지구','캠퍼스','연락처','참석','회비납부','참석체크','호실','키수령','등록일']]
    regs.forEach(r => rows.push([r.name, r.cohort + '기', r.district, r.campus, r.phone,
      r.attending ? 'O' : 'X', r.fee_paid ? 'O' : '', r.attended ? 'O' : '',
      r.room_number || '', r.key_taken ? 'O' : '', r.registered_at?.slice(0,10) || '']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type: 'text/csv' })); a.download = '포럼등록자.csv'; a.click()
  }

  const displayed = filterAttending ? regs.filter(r => r.attending === true) : regs
  const total = regs.length
  const attending = regs.filter(r => r.attending === true).length
  const feePaid = regs.filter(r => r.fee_paid).length
  const keyTaken = regs.filter(r => r.key_taken).length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[['전체', total, '#a78bfa'], ['참석', attending, '#4dd9ff'], ['회비납부', feePaid, '#22c55e'], ['키수령', keyTaken, '#f59e0b']].map(([l, n, c]) => (
          <div key={l as string} className="rounded-xl p-3 text-center" style={{ background: '#1a0f3a' }}>
            <p className="font-black text-xl" style={{ color: c as string }}>{n as number}</p>
            <p className="text-white/40 text-xs">{l as string}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setFilterAttending(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: filterAttending ? '#7c5cfc' : 'rgba(124,92,252,0.15)', color: filterAttending ? 'white' : '#a78bfa' }}>
            참석자만
          </button>
          <button onClick={() => setFilterAttending(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: !filterAttending ? '#7c5cfc' : 'rgba(124,92,252,0.15)', color: !filterAttending ? 'white' : '#a78bfa' }}>
            전체
          </button>
        </div>
        <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/60" style={{ background: 'rgba(255,255,255,0.08)' }}>
          CSV 내보내기
        </button>
      </div>

      {loading ? <p className="text-white/40 text-sm text-center py-8">불러오는 중...</p> : (
        <div className="overflow-x-auto rounded-2xl" style={{ background: '#1a0f3a' }}>
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(124,92,252,0.2)' }}>
                {['이름','기수','지구','캠퍼스','연락처','참석','회비납부','참석체크','호실','키수령'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold" style={{ color: '#a78bfa' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="px-3 py-2 text-white font-bold">{r.name}</td>
                  <td className="px-3 py-2 text-white/60">{r.cohort}기</td>
                  <td className="px-3 py-2 text-white/60">{r.district}</td>
                  <td className="px-3 py-2 text-white/60">{r.campus}</td>
                  <td className="px-3 py-2 text-white/60">{r.phone}</td>
                  <td className="px-3 py-2"><span style={{ color: r.attending ? '#4dd9ff' : 'rgba(255,255,255,0.3)' }}>{r.attending ? 'O' : 'X'}</span></td>
                  <td className="px-3 py-2">
                    <Checkbox checked={!!r.fee_paid} disabled={saving === r.id} onChange={v => patch(r.id, { fee_paid: v })} color="#22c55e" />
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox checked={!!r.attended} disabled={saving === r.id} onChange={v => patch(r.id, { attended: v })} color="#4dd9ff" />
                  </td>
                  <td className="px-3 py-2">
                    <input defaultValue={r.room_number || ''} onBlur={e => { if (e.target.value !== (r.room_number || '')) patch(r.id, { room_number: e.target.value }) }}
                      placeholder="호실" className="w-14 rounded-lg px-2 py-1 text-white text-xs outline-none text-base"
                      style={{ background: 'rgba(124,92,252,0.2)', border: '1px solid rgba(124,92,252,0.3)' }} />
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox checked={!!r.key_taken} disabled={saving === r.id} onChange={v => patch(r.id, { key_taken: v })} color="#f59e0b" />
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-white/30">등록자가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Tab 2: Rooms ─────────────── */
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
      const list: Reg[] = (rr.registrations || []).filter((r: Reg) => r.attending === true)
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
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={saveAll} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: '#7c5cfc' }}>
          {saving ? '저장 중...' : '전체 저장'}
        </button>
        {msg && <span className="text-green-400 text-sm">{msg}</span>}
        <div className="flex gap-2 ml-auto">
          <button onClick={() => publish(true)} disabled={published || saving}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: published ? 'rgba(34,197,94,0.3)' : '#22c55e' }}>
            {published ? '✓ 공지됨' : '배정 공지하기'}
          </button>
          {published && (
            <button onClick={() => publish(false)} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
              공지 취소
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {regs.map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#1a0f3a' }}>
            <span className="text-white font-bold text-sm flex-1">{r.name}</span>
            <span className="text-white/40 text-xs">{r.district}</span>
            <input value={rooms[r.id] || ''} onChange={e => setRooms(prev => ({ ...prev, [r.id]: e.target.value }))}
              placeholder="호실" className="w-16 rounded-lg px-2 py-1 text-white text-xs text-center outline-none text-base"
              style={{ background: 'rgba(124,92,252,0.2)', border: '1px solid rgba(124,92,252,0.3)' }} />
          </div>
        ))}
      </div>

      {Object.keys(grouped).length > 0 && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1a0f3a' }}>
          <p className="text-white/60 text-xs font-bold">호실별 배정 미리보기</p>
          {Object.entries(grouped).sort().map(([room, names]) => (
            <div key={room} className="flex items-start gap-3">
              <span className="font-black text-sm shrink-0" style={{ color: room === '미배정' ? '#f87171' : '#4dd9ff', minWidth: '3rem' }}>{room}</span>
              <span className="text-white/70 text-sm">{names.join(', ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────── Tab 3: Meals ─────────────── */
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
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1a0f3a' }}>
        <p className="text-white font-bold text-sm">메뉴 목록 (한 줄에 하나씩)</p>
        <textarea value={menuText} onChange={e => setMenuText(e.target.value)} rows={5}
          placeholder={'갈비탕\n비빔밥\n된장찌개'}
          className="w-full rounded-xl px-4 py-3 text-white outline-none resize-none text-base"
          style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)' }} />
        <div className="flex items-center gap-3">
          <button onClick={saveMenu} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#7c5cfc' }}>
            메뉴 저장
          </button>
          {msg && <span className="text-green-400 text-sm">{msg}</span>}
        </div>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1a0f3a' }}>
        <p className="text-white font-bold text-sm">주문 받을 시간</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/50 text-xs mb-1 block">시작</label>
            <input type="datetime-local" value={orderStart} onChange={e => setOrderStart(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-white outline-none text-base"
              style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)', colorScheme: 'dark' }} />
          </div>
          <div>
            <label className="text-white/50 text-xs mb-1 block">종료</label>
            <input type="datetime-local" value={orderEnd} onChange={e => setOrderEnd(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-white outline-none text-base"
              style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)', colorScheme: 'dark' }} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={publishOrder} disabled={saving || !orderStart || !orderEnd}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: active ? 'rgba(34,197,94,0.3)' : '#22c55e' }}>
            {active ? '✓ 주문 공지 중' : '주문 공지하기'}
          </button>
          {active && (
            <button onClick={cancelOrder} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
              주문 취소
            </button>
          )}
        </div>
      </div>

      {orders.length > 0 && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1a0f3a' }}>
          <div className="flex items-center justify-between">
            <p className="text-white font-bold text-sm">주문 현황 ({orders.length}건)</p>
            <div className="flex gap-2 text-xs">
              {Object.entries(menuCounts).map(([item, cnt]) => (
                <span key={item} className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,92,252,0.3)', color: '#a78bfa' }}>{item} {cnt}</span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr style={{ borderBottom: '1px solid rgba(124,92,252,0.2)' }}>
                {['이름','메뉴','시간'].map(h => <th key={h} className="px-2 py-1.5 text-left" style={{ color: '#a78bfa' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-2 py-1.5 text-white">{o.name}</td>
                    <td className="px-2 py-1.5 text-white/70">{o.menu_item}</td>
                    <td className="px-2 py-1.5 text-white/40">{new Date(o.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</td>
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

/* ─────────────── Tab 4: Settings (mobile-friendly) ─────────────── */
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
    <div className="space-y-4 max-w-sm mx-auto">
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#1a0f3a' }}>
        <p className="text-white/50 text-xs font-bold uppercase tracking-wider">등록 오픈</p>
        <p className="text-white/70 text-sm">마감일(11월 15일) 이후에도 오늘 하루 등록 가능하게 열기</p>
        <button onClick={() => toggleRegOpen(!regOpen)} disabled={saving}
          className="w-full py-5 rounded-2xl font-black text-xl text-white transition-all disabled:opacity-40"
          style={{ background: regOpen ? 'linear-gradient(135deg,#22c55e,#4dd9ff)' : 'linear-gradient(135deg,#7c5cfc,#a78bfa)', boxShadow: regOpen ? '0 4px 24px rgba(34,197,94,0.4)' : '0 4px 24px rgba(124,92,252,0.4)' }}>
          {saving ? '처리 중...' : regOpen ? '🟢 오픈 중' : '🔴 닫힘'}
        </button>
        <p className="text-white/25 text-xs text-center">당일 자정(00:00)에 자동으로 닫힙니다</p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#1a0f3a' }}>
        <p className="text-white/40 text-xs">등록 마감일: <span className="text-white/70">2026년 11월 15일</span></p>
        <p className="text-white/40 text-xs mt-1">문의: 김양연 간사 010-9154-6113</p>
      </div>
    </div>
  )
}

/* ─────────────── Checkbox ─────────────── */
function Checkbox({ checked, onChange, disabled, color }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; color?: string }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all disabled:opacity-40"
      style={{ background: checked ? (color || '#7c5cfc') : 'transparent', borderColor: checked ? (color || '#7c5cfc') : 'rgba(255,255,255,0.3)' }}>
      {checked && <span className="text-white text-xs font-black">✓</span>}
    </button>
  )
}
