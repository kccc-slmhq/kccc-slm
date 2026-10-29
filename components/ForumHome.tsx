"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PRAYERS, getTodayStr, getDday } from '@/lib/forum/prayers'

const SCHEDULE = [
  {
    day: '1일차', date: '11월 23일 (월)',
    items: [
      { time: '12:00', label: '등록' },
      { time: '14:00', label: '축복의 시간 & 찬양' },
      { time: '14:20', label: '메시지' },
      { time: '14:40', label: '캠퍼스 학생 현황 발표' },
      { time: '15:30', label: '휴식 시간' },
      { time: '15:50', label: '지구별 교육 커리 발표' },
      { time: '16:50', label: '전국 SLM 교육 커리 요약 정리' },
      { time: '17:30', label: '저녁 식사' },
      { time: '19:00', label: '나눔 질문 및 설문 결과 발표' },
      { time: '19:30', label: 'AI를 통한 교육 컨텐츠 개발' },
      { time: '20:50', label: '광고 및 마무리' },
    ],
  },
  {
    day: '2일차', date: '11월 24일 (화)',
    items: [
      { time: '08:00', label: '개인 경건의 시간 및 아침 식사' },
      { time: '09:00', label: '나눔 및 설문 결과 발표' },
      { time: '09:40', label: '순모임에 관한 강의' },
      { time: '11:00', label: '휴식' },
      { time: '11:20', label: 'Grow DiP' },
      { time: '11:50', label: '기도 / 광고 및 마무리' },
    ],
  },
]

const DEADLINE = new Date('2026-11-15T00:00:00+09:00')
const todayKST = () => new Date().toLocaleDateString('sv', { timeZone: 'Asia/Seoul' })

const PACKING_ITEMS: { id: string; emoji: string; label: string }[] = []


const ACCOUNT = '3333-29-2677428'
const BANK = '카카오뱅크'
const HOLDER = '박예찬'

const INPUT_CLS = "w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#7c5cfc]/70 text-base"

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 7) return d.slice(0, 3) + '-' + d.slice(3)
  return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7)
}

function formatIdNumber(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 13)
  if (d.length <= 6) return d
  return d.slice(0, 6) + '-' + d.slice(6)
}


const EVENT_START = new Date('2026-11-23T00:00:00+09:00')

type AppSettings = {
  meal_order_active: boolean
  meal_order_start: string
  meal_order_end: string
  meal_menu: string[]
  rooms_published: boolean
}

export default function ForumHome() {
  const [activeDay, setActiveDay] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [regOverride, setRegOverride] = useState(false)
  const [popupNotice, setPopupNotice] = useState<{id: string; title: string; content: string} | null>(null)
  const [appSettings, setAppSettings] = useState<AppSettings>({ meal_order_active: false, meal_order_start: '', meal_order_end: '', meal_menu: [], rooms_published: false })
  const [showMealOrder, setShowMealOrder] = useState(false)
  const [showRoomSearch, setShowRoomSearch] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('announcements').select('content').eq('title', '__reg_open__').maybeSingle()
      .then(({ data }) => { if (data && data.content === todayKST()) setRegOverride(true) })
  }, [])

  useEffect(() => {
    fetch('/api/notices').then(r => r.json()).then(({ notices }) => {
      if (!notices?.length) return
      let seen: string[] = []
      try { seen = JSON.parse(localStorage.getItem('noticed_ids') || '[]') } catch {}
      const unseen = notices.find((n: {id: string}) => !seen.includes(n.id))
      if (unseen) setPopupNotice(unseen)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      const s = d.settings || {}
      const now = Date.now()
      const start = s.meal_order_start ? new Date(s.meal_order_start).getTime() : 0
      const end = s.meal_order_end ? new Date(s.meal_order_end).getTime() : 0
      const mealActive = s.meal_order_active === 'true' && now >= start && now <= end
      let menu: string[] = []
      try { menu = JSON.parse(s.meal_menu || '[]') } catch {}
      setAppSettings({
        meal_order_active: mealActive,
        meal_order_start: s.meal_order_start || '',
        meal_order_end: s.meal_order_end || '',
        meal_menu: menu,
        rooms_published: s.rooms_published === 'true',
      })
    }).catch(() => {})
  }, [])

  function dismissPopup() {
    if (!popupNotice) return
    try {
      const seen: string[] = JSON.parse(localStorage.getItem('noticed_ids') || '[]')
      seen.push(popupNotice.id)
      localStorage.setItem('noticed_ids', JSON.stringify(seen))
    } catch {}
    setPopupNotice(null)
  }

  const now = new Date()
  const isEventDay = now >= EVENT_START
  const isClosed = !regOverride && now >= DEADLINE

  return (
    <div className="min-h-screen bg-[#0f0830]">
      {/* Notice Popup */}
      {popupNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }}>
            <p className="font-black text-lg text-white mb-2">{popupNotice.title}</p>
            {popupNotice.content && <p className="text-white/70 text-sm leading-relaxed mb-5">{popupNotice.content}</p>}
            <button onClick={dismissPopup} className="w-full py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#7c5cfc' }}>확인</button>
          </div>
        </div>
      )}
      {/* Hero Banner */}
      <div className="relative w-full overflow-hidden" style={{ maxHeight: '220px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/forum-banner.png" alt="교육간사 포럼"
          className="w-full object-cover block"
          onError={e => (e.currentTarget.style.display = 'none')} />
        <div className="absolute inset-x-0 bottom-0" style={{ height: '80px', background: 'linear-gradient(to bottom, transparent, #0f0830)' }} />
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-lg mx-auto space-y-5">

        <AskAI />

        {/* 디데이 + 오늘의 기도제목 */}
        <section className="card-dark rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/40 text-xs">교육간사 포럼까지</p>
              <p className="text-[#a78bfa] font-black text-3xl mt-0.5">{getDday()}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs">2026년 11월 23일</p>
              <p className="text-white/60 text-xs">수원 CCC 회관</p>
            </div>
          </div>
          {(() => {
            const prayer = PRAYERS.find(p => p.date === getTodayStr())
            return prayer ? (
              <>
                <div className="h-px bg-white/10" />
                <div>
                  <p className="text-[#a78bfa] text-xs font-bold mb-1.5">🙏 오늘의 기도제목</p>
                  <p className="text-white/80 text-sm leading-relaxed">{prayer.text}</p>
                </div>
              </>
            ) : null
          })()}
        </section>

        <InfoTabs activeDay={activeDay} setActiveDay={setActiveDay} />
        <FeeCard />

        {/* 수련회 장소 */}
        <section>
          <h2 className="text-[#a78bfa] font-bold text-lg mb-3 flex items-center gap-2">
            <span>📍</span> 수련회 장소
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <a href="https://naver.me/FOR75yzX"
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col gap-2 card-dark rounded-2xl p-4 active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-900/50 flex items-center justify-center text-xl border border-purple-500/30">🏢</div>
              <div>
                <p className="text-white font-bold text-sm leading-snug">수원CCC 회관</p>
                <p className="text-white/40 text-xs mt-0.5">경기 수원시 권선구 새터로23번길 12-6</p>
                <p className="text-[#4dd9ff] text-xs font-bold mt-1">네이버 지도 →</p>
              </div>
            </a>
            <a href="https://naver.me/5vJUGSbp"
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col gap-2 card-dark rounded-2xl p-4 active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-900/50 flex items-center justify-center text-xl border border-purple-500/30">🏨</div>
              <div>
                <p className="text-white font-bold text-sm leading-snug">숙소(홈스테이 수원)</p>
                <p className="text-white/40 text-xs mt-0.5">경기 수원시 팔달구 인계로 116</p>
                <p className="text-[#4dd9ff] text-xs font-bold mt-1">네이버 지도 →</p>
              </div>
            </a>
          </div>
        </section>

        {/* 포럼 아카이브 */}
        <ArchiveSection />

        {/* 여행자보험 */}
        <section>
          <h2 className="text-[#a78bfa] font-bold text-lg mb-3 flex items-center gap-2">
            <span>🛡️</span> 여행자보험
          </h2>
          <div className="card-dark rounded-2xl p-4 space-y-3">
            <div className="space-y-1.5">
              <p className="text-white/80 text-sm font-medium">🛡️ SLMHQ에서 단체 여행자보험에 가입해 드립니다.</p>
              <p className="text-white/55 text-sm">사고·부상 시 <span className="font-bold text-white">한화손보 모바일 앱</span>으로 보험금 신청 가능</p>
              <p className="text-white/35 text-xs">※ 보험 가입 여부는 등록 완료 후 개별 안내</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold mb-2">보험금 신청 앱 설치</p>
              <div className="grid grid-cols-2 gap-3">
                <a href="https://play.google.com/store/apps/details?id=com.hanwha.hima&hl=ko"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl py-3 font-bold text-sm transition-all active:scale-95 bg-[#7c5cfc] text-white">
                  🤖 Android
                </a>
                <a href="https://apps.apple.com/kr/app/%ED%95%9C%ED%99%94%EC%86%90%EB%B3%B4-%EB%AA%A8%EB%B0%94%EC%9D%BC-%EC%95%B1/id959889713"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl py-3 font-bold text-sm transition-all active:scale-95 bg-[#7c5cfc] text-white">
                  🍎 iPhone
                </a>
              </div>
            </div>
          </div>
        </section>

        <NoticeSection />

        <footer className="text-center text-white/30 text-xs pb-24 pt-4">
          <p>2026 CCC SLM 교육간사 포럼</p>
          <p className="mt-1">문의: 김양연 간사 010-9154-6113</p>
        </footer>
      </div>

      {/* Floating bottom buttons */}
      <div className="fixed bottom-6 left-0 right-0 z-50 px-5 space-y-2">
        {/* 식사 주문 버튼 */}
        {appSettings.meal_order_active && (
          <button onClick={() => setShowMealOrder(true)}
            className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 text-white"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', boxShadow: '0 8px 36px rgba(245,158,11,0.5)' }}>
            🍽️ 식사 주문하기
          </button>
        )}
        {/* 호실 배정 버튼 */}
        {appSettings.rooms_published && (
          <button onClick={() => setShowRoomSearch(true)}
            className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 text-white"
            style={{ background: 'linear-gradient(135deg,#7c5cfc,#4dd9ff)', boxShadow: '0 8px 36px rgba(124,92,252,0.5)' }}>
            🛏️ 배정 호실 보기
          </button>
        )}
        {/* 등록하기 / 마감 버튼 (포럼 당일부터 숨김) */}
        {!isEventDay && (
          <FloatingRegisterBtn onClick={() => isClosed ? setShowClosed(true) : setShowModal(true)} isClosed={isClosed} />
        )}
      </div>

      {showClosed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowClosed(false)}>
          <div className="rounded-3xl w-full max-w-sm p-7 text-center space-y-3" style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="text-5xl">🔒</div>
            <p className="text-[#a78bfa] font-black text-xl">등록이 마감되었습니다</p>
            <p className="text-white/60 text-sm leading-relaxed">
              2026년 11월 15일자로 등록이 마감되었습니다.<br />
              추가 등록을 원하시면 김양연 간사에게 문의해주세요.
            </p>
            <p className="text-[#a78bfa] font-bold text-sm">김양연 간사 · 010-9154-6113</p>
            <button onClick={() => setShowClosed(false)}
              className="w-full btn-gold py-3 rounded-2xl font-bold mt-2">확인</button>
          </div>
        </div>
      )}

      {showModal && <RegisterModal onClose={() => setShowModal(false)} />}
      {showMealOrder && <MealOrderModal menu={appSettings.meal_menu} onClose={() => setShowMealOrder(false)} />}
      {showRoomSearch && <RoomSearchModal onClose={() => setShowRoomSearch(false)} />}
    </div>
  )
}

const ARCHIVE_OPEN = new Date('2026-11-23T12:00:00+09:00')
const ARCHIVE_URL = 'https://drive.google.com/drive/folders/1PXEK9gk8eUhMXJqWHlppsUMrW5oHxO5r?usp=sharing'

function ArchiveSection() {
  const [locked, setLocked] = useState(new Date() < ARCHIVE_OPEN)
  const [showMsg, setShowMsg] = useState(false)

  useEffect(() => {
    setLocked(new Date() < ARCHIVE_OPEN)
  }, [])

  function handleClick() {
    if (locked) { setShowMsg(true); return }
    window.open(ARCHIVE_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <section>
      <h2 className="text-[#a78bfa] font-bold text-lg mb-3 flex items-center gap-2">
        <span>📁</span> 교육간사 포럼 아카이브
      </h2>
      <button onClick={handleClick}
        className="w-full flex items-center gap-4 card-dark rounded-2xl p-5 active:scale-95 transition-all text-left">
        <div className="w-12 h-12 rounded-xl bg-purple-900/50 flex items-center justify-center shrink-0 text-2xl border border-purple-500/30">
          {locked ? '🔒' : '📂'}
        </div>
        <div>
          <p className="text-white font-bold">자료 보러 가기</p>
          <p className="text-white/50 text-xs mt-0.5">포럼 자료 및 아카이브</p>
          <p className={`text-xs font-bold mt-1 ${locked ? 'text-white/30' : 'text-[#a78bfa]'}`}>
            {locked ? '11월 23일 오후 12시부터 공개' : '드라이브 열기 →'}
          </p>
        </div>
      </button>
      {showMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowMsg(false)}>
          <div className="rounded-3xl w-full max-w-sm p-7 text-center space-y-3" style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="text-5xl">🔒</div>
            <p className="text-[#a78bfa] font-black text-xl">아직 공개 전이에요</p>
            <p className="text-white/60 text-sm leading-relaxed">포럼이 시작되면 열려요<br /><span className="text-white/40 text-xs">11월 23일 오후 12시 이후 공개</span></p>
            <button onClick={() => setShowMsg(false)}
              className="w-full btn-gold py-3 rounded-2xl font-bold mt-2">확인</button>
          </div>
        </div>
      )}
    </section>
  )
}

function NoticeSection() {
  const [open, setOpen] = useState(false)
  const [notices, setNotices] = useState<Array<{id: string; title: string; content?: string; created_at: string}>>([])

  function openSheet() {
    setOpen(true)
    if (notices.length > 0) return
    const supabase = createClient()
    supabase.from('announcements').select('*').eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setNotices(data) })
  }

  return (
    <>
      <section>
        <button onClick={openSheet}
          className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5"
          style={{ background: 'linear-gradient(135deg,#7c5cfc,#4dd9ff)' }}>
          <span className="text-white font-bold text-base flex items-center gap-2">
            <span>📢</span> 공지 보기
          </span>
          <span className="text-white/70 text-lg">›</span>
        </button>
      </section>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg flex flex-col" style={{ background: '#1a0f3a', borderRadius: '24px 24px 0 0', maxHeight: '75vh', marginBottom: '-100px', paddingBottom: '100px' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-3" style={{ background: 'rgba(255,255,255,0.3)' }} />
            <p className="font-bold text-white text-base px-5 mb-3">📢 공지사항</p>
            <div className="overflow-y-auto px-5 pb-36 space-y-3">
              {notices.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-6">공지사항이 없습니다</p>
              ) : notices.map(a => (
                <div key={a.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="font-bold text-white text-sm">{a.title}</p>
                  {a.content && <p className="text-white/70 text-sm mt-1 whitespace-pre-line">{a.content}</p>}
                  <p className="text-white/30 text-xs mt-2">{new Date(a.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FeeCard() {
  const [copied, setCopied] = useState(false)
  function copyAccount() {
    navigator.clipboard.writeText(ACCOUNT).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <section>
      <h2 className="text-[#a78bfa] font-bold text-lg mb-3 flex items-center gap-2">
        <span>💳</span> 회비 납부
      </h2>
      <div className="card-dark rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/50 space-y-1">
            <p>{BANK} · {HOLDER}</p>
            <p className="font-mono text-white/80 font-bold tracking-wide">{ACCOUNT}</p>
          </div>
          <div className="text-right">
            <p className="text-[#a78bfa] font-black text-xl">50,000원</p>
          </div>
        </div>
        <button onClick={copyAccount}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-[#7c5cfc] text-white'}`}>
          {copied ? <><span>✓</span> 복사됐어요!</> : <><span>📋</span> 계좌번호 복사</>}
        </button>
        <p className="text-white/25 text-xs text-center">입금자명을 참여자 이름으로 해주세요</p>
      </div>
    </section>
  )
}

function PackingChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('packing_checked') || '{}') } catch { return {} }
  })
  function toggle(id: string) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('packing_checked', JSON.stringify(next))
      return next
    })
  }
  function reset() {
    setChecked({})
    localStorage.removeItem('packing_checked')
  }
  const doneCount = PACKING_ITEMS.filter(i => checked[i.id]).length
  const total = PACKING_ITEMS.length
  const allDone = doneCount === total
  return (
    <section>
      <h2 className="text-[#a78bfa] font-bold text-lg mb-3 flex items-center gap-2">
        <span>🎒</span> 준비물 체크리스트
      </h2>
      <div className="card-dark rounded-2xl overflow-hidden">
        {allDone && (
          <div className="px-4 py-3 text-center bg-[#7c5cfc]/10 border-b border-[#7c5cfc]/20">
            <p className="text-[#a78bfa] font-bold text-sm">🎉 기대하는 마음으로 포럼에서 만나요!</p>
          </div>
        )}
        <div className="divide-y divide-white/5">
          {PACKING_ITEMS.map(item => (
            <button key={item.id} onClick={() => toggle(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-white/5 text-left">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${checked[item.id] ? 'bg-[#7c5cfc] border-[#7c5cfc]' : 'border-white/20'}`}>
                {checked[item.id] && <span className="text-white text-xs font-black">✓</span>}
              </div>
              <span className="text-lg shrink-0">{item.emoji}</span>
              <span className={`text-sm transition-all ${checked[item.id] ? 'text-white/30 line-through' : 'text-white/80'}`}>{item.label}</span>
            </button>
          ))}
        </div>
        {allDone && (
          <div className="px-4 py-3 border-t border-white/5">
            <button onClick={reset} className="w-full text-white/30 text-xs text-center">초기화</button>
          </div>
        )}
      </div>
    </section>
  )
}

function InfoTabs({ activeDay, setActiveDay }: { activeDay: number; setActiveDay: (d: number) => void }) {
  const [tab, setTab] = useState(0)
  const TABS = [
    { label: '⛺ 행사안내', id: 0 },
    { label: '🗓️ 일정표',  id: 1 },
    { label: '🎒 준비물',  id: 2 },
  ]
  return (
    <section>
      <div className="flex gap-2 mb-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-sm transition-all ${tab === t.id ? 'btn-gold shadow-md' : 'card-dark text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 0 && (
        <div className="card-dark rounded-2xl p-5 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <InfoRow icon={<img src="/g7-logo.webp" alt="" style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />} label="일시" value="2026년 11월 23일(월) ~ 24일(화)" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <InfoRow icon={<img src="/g7-logo.webp" alt="" style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />} label="장소" value="수원 CCC 회관" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <InfoRow icon={<img src="/g7-logo.webp" alt="" style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />} label="주제" value={<>가르쳐 지키게 하라<br /><span className="text-white/40 text-xs font-normal">📖 마태복음 28:20a</span></>} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <InfoRow icon={<img src="/g7-logo.webp" alt="" style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />} label="대상" value="SLM 교육간사" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <InfoRow icon={<img src="/g7-logo.webp" alt="" style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />} label="회비" value="50,000원" />
        </div>
      )}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {SCHEDULE.map((s, i) => (
              <button key={i} onClick={() => setActiveDay(i)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${activeDay === i ? 'btn-gold' : 'card-dark text-white/60'}`}>
                {s.day}<br/><span className="text-xs font-normal">{s.date}</span>
              </button>
            ))}
          </div>
          <div className="card-dark rounded-2xl p-4 space-y-2.5">
            {SCHEDULE[activeDay].items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[#a78bfa] font-mono font-bold text-sm w-12 shrink-0">{item.time}</span>
                <div className="w-px self-stretch bg-[#7c5cfc]/20" />
                <span className="text-white/80 text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 2 && <PackingChecklist />}
    </section>
  )
}

function AskAI() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  async function ask() {
    if (!question.trim() || loading) return
    setLoading(true)
    setAnswer('')
    try {
      let notices = undefined
      if (/공지/.test(question)) {
        const supabase = createClient()
        const { data } = await supabase.from('announcements').select('title,content,created_at')
          .eq('is_published', true).order('created_at', { ascending: false }).limit(3)
        notices = data || []
      }
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), notices })
      })
      const data = await res.json()
      setAnswer(data.answer || '죄송해요, 잠시 후 다시 시도해주세요.')
    } catch {
      setAnswer('연결 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    }
    setLoading(false)
  }

  return (
    <section>
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'linear-gradient(135deg, #7c5cfc, #4dd9ff)', boxShadow: '0 4px 20px rgba(124,92,252,0.3)' }}>
        <p className="text-white font-black text-base">교육간사 포럼 AI — 무엇이든 물어보세요! ✨</p>
        <div className="flex gap-2 items-center">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            placeholder="무엇이든 물어보세요"
            className="flex-1 bg-white/15 rounded-xl px-4 py-2.5 text-white placeholder-white/40 outline-none text-sm focus:bg-white/20 transition-all" />
          <button onClick={ask} disabled={loading || !question.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-all text-base font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}>
            {loading ? (
              <span className="flex gap-0.5 items-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full" style={{ animation: 'btnDot 1.2s infinite' }} />
                <span className="w-1.5 h-1.5 bg-white rounded-full" style={{ animation: 'btnDot 1.2s infinite', animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 bg-white rounded-full" style={{ animation: 'btnDot 1.2s infinite', animationDelay: '0.4s' }} />
              </span>
            ) : '➤'}
          </button>
        </div>
        {answer && !loading && (
          <div className="rounded-xl px-4 py-3 space-y-3" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(124,92,252,0.3)' }}>
            <p className="text-white text-sm leading-relaxed whitespace-pre-line">{answer}</p>
            <button onClick={() => { setAnswer(''); setQuestion('') }}
              className="w-full py-2 rounded-lg text-sm font-bold text-[#a78bfa] bg-white/10 hover:bg-white/15 transition-all">확인</button>
          </div>
        )}
      </div>
    </section>
  )
}


function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg shrink-0 flex items-center justify-center">{icon}</span>
      <div>
        <span className="text-white/50 text-xs">{label}</span>
        <p className="text-white font-semibold text-sm">{value}</p>
      </div>
    </div>
  )
}

function FloatingRegisterBtn({ onClick, isClosed }: { onClick: () => void; isClosed: boolean }) {
  return (
    <button onClick={onClick}
      className="w-full btn-gold py-4 rounded-2xl font-black text-lg flex flex-col items-center justify-center gap-0.5"
      style={{ boxShadow: '0 8px 36px rgba(124,92,252,0.5)', opacity: isClosed ? 0.75 : 1 }}>
      {isClosed ? (
        <span className="flex items-center gap-2"><span>🔒</span> 등록 마감</span>
      ) : (
        <>
          <span className="flex items-center gap-2"><span>✍️</span> 교육간사포럼 등록하기</span>
          <span className="text-xs font-semibold opacity-80">📅 등록 마감 11월 15일</span>
        </>
      )}
    </button>
  )
}

/* ── 식사 주문 팝업 ── */
function MealOrderModal({ menu, onClose }: { menu: string[]; onClose: () => void }) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!name.trim() || !selected) return
    setSubmitting(true); setErr('')
    const r = await fetch('/api/meal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), menu_item: selected }),
    })
    const d = await r.json()
    setSubmitting(false)
    if (d.error) { setErr('주문 시간이 지났거나 오류가 발생했습니다'); return }
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl p-6 space-y-4 pb-10"
        style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-black text-xl text-white">🍽️ 식사 주문</p>
          <button onClick={onClose} className="text-white/40 text-2xl leading-none">×</button>
        </div>
        {done ? (
          <div className="text-center py-8 space-y-3">
            <div className="text-5xl">✅</div>
            <p className="text-white font-black text-xl">주문 완료!</p>
            <p className="text-white/60 text-sm">{name} · {selected}</p>
            <button onClick={onClose} className="w-full btn-gold py-3 rounded-2xl font-bold mt-2">닫기</button>
          </div>
        ) : (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력"
              className={INPUT_CLS} />
            <div className="space-y-2">
              <p className="text-white/50 text-xs font-bold">메뉴 선택</p>
              {menu.map(item => (
                <button key={item} onClick={() => setSelected(item)}
                  className="w-full py-3.5 rounded-xl font-bold text-left px-4 transition-all"
                  style={{ background: selected === item ? '#7c5cfc' : 'rgba(255,255,255,0.07)', color: selected === item ? 'white' : 'rgba(255,255,255,0.8)', border: `1px solid ${selected === item ? '#7c5cfc' : 'rgba(255,255,255,0.1)'}` }}>
                  {selected === item && '✓ '}{item}
                </button>
              ))}
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <button onClick={submit} disabled={!name.trim() || !selected || submitting}
              className="w-full btn-gold py-4 rounded-2xl font-black text-lg disabled:opacity-40">
              {submitting ? '주문 중...' : '주문하기'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ── 호실 검색 팝업 ── */
type RoomResult = { name: string; cohort: string; district: string; room_number: string; roommates: { name: string; cohort: string; district: string }[] }

function RoomSearchModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [cohort, setCohort] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RoomResult[] | null>(null)
  const [err, setErr] = useState('')

  async function search() {
    if (!name.trim() || !cohort.trim()) return
    setLoading(true); setErr(''); setResults(null)
    const r = await fetch(`/api/rooms?name=${encodeURIComponent(name.trim())}&cohort=${encodeURIComponent(cohort.trim())}`)
    const d = await r.json()
    setLoading(false)
    if (d.error === 'not found') { setErr('이름 또는 기수를 확인해주세요'); return }
    if (d.error) { setErr('오류가 발생했습니다'); return }
    setResults(d.results || [])
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl p-6 space-y-4 pb-10"
        style={{ background: '#1a0f3a', border: '1px solid rgba(124,92,252,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-black text-xl text-white">🛏️ 배정 호실 확인</p>
          <button onClick={onClose} className="text-white/40 text-2xl leading-none">×</button>
        </div>
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="이름" className={INPUT_CLS} style={{ flex: 2 }} />
          <input value={cohort} onChange={e => setCohort(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="기수 (숫자만)" inputMode="numeric"
            className={INPUT_CLS} style={{ flex: 1 }} />
        </div>
        <button onClick={search} disabled={!name.trim() || !cohort.trim() || loading}
          className="w-full btn-gold py-4 rounded-2xl font-black text-lg disabled:opacity-40">
          {loading ? '검색 중...' : '검색'}
        </button>
        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
        {results && results.length > 0 && results.map((r, i) => (
          <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ background: '#7c5cfc', color: 'white' }}>
                {r.room_number || '?'}
              </div>
              <div>
                <p className="text-white font-black text-lg">{r.room_number ? `${r.room_number}호` : '미배정'}</p>
                <p className="text-white/50 text-xs">{r.name} · {r.cohort}기 · {r.district}</p>
              </div>
            </div>
            {r.roommates.length > 0 && (
              <div>
                <p className="text-white/40 text-xs font-bold mb-2">룸메이트</p>
                <div className="space-y-1.5">
                  {r.roommates.map((m, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <span className="text-white font-bold">{m.name}</span>
                      <span className="text-white/40 text-xs">{m.cohort}기 · {m.district}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {r.roommates.length === 0 && r.room_number && (
              <p className="text-white/40 text-sm">룸메이트 없음 (1인실)</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SelectDrop({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm font-bold transition-all ${value ? 'bg-[#7c5cfc] text-white border-[#7c5cfc]' : 'bg-white/5 border-white/10 text-white/40'}`}>
        <span>{value || placeholder}</span>
        <span className="text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 border border-[#7c5cfc]/30 rounded-xl shadow-lg overflow-hidden" style={{ background: '#1a0f3a' }}>
          <div className="grid grid-cols-4 gap-0 divide-x divide-y divide-white/5">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }}
                className={`py-3 text-sm font-bold transition-all ${value === opt ? 'bg-[#7c5cfc] text-white' : 'text-white/70 hover:bg-white/5 active:bg-white/10'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-white/60 text-xs mb-1.5 flex items-center gap-1 block">
        {label} {required && <span className="text-[#a78bfa]">*</span>}
        {hint && <span className="text-white/30 font-normal">· {hint}</span>}
      </label>
      {children}
    </div>
  )
}

const CHALLENGES = [
  '순장/학생 리더십 발굴 및 제자화 적용의 어려움',
  'Z세대/알파세대와의 소통 및 문화적 격차',
  '교육 콘텐츠/교재의 노후화 및 미디어 활용의 어려움',
  '개인의 영적·신체적 고갈(번아웃) 및 역량 개발 한계',
]

function SectionHeader({ label }: { label: string }) {
  return <p className="text-[#a78bfa]/70 text-xs font-bold tracking-widest uppercase pt-1">{label}</p>
}

function RadioGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-3 cursor-pointer" onClick={() => onChange(opt)}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${value === opt ? 'border-[#7c5cfc]' : 'border-white/30'}`}>
            {value === opt && <div className="w-2.5 h-2.5 rounded-full bg-[#7c5cfc]" />}
          </div>
          <span className="text-white/80 text-sm">{opt}</span>
        </label>
      ))}
    </div>
  )
}

type ForumReg = {
  name: string; cohort: string; district: string; campus: string; phone: string
  attending: boolean | null
  absent_reason: string
  consent: boolean
  attendance_type: string; transportation: string; carpool_seats: string
  room_note: string
  gender: string; id_number: string; extra_note: string
  challenges: string[]; challenge_other: string
  desired_topic: string; questions: string
}
const EMPTY_REG: ForumReg = {
  name: '', cohort: '', district: '', campus: '', phone: '',
  attending: null,
  absent_reason: '',
  consent: false,
  attendance_type: '', transportation: '', carpool_seats: '',
  room_note: '',
  gender: '', id_number: '', extra_note: '',
  challenges: [], challenge_other: '',
  desired_topic: '', questions: '',
}

export function RegisterModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<ForumReg>({ ...EMPTY_REG })
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof ForumReg>(field: K, value: ForumReg[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleChallenge(val: string) {
    setForm(prev => ({
      ...prev,
      challenges: prev.challenges.includes(val)
        ? prev.challenges.filter(c => c !== val)
        : [...prev.challenges, val],
    }))
  }

  async function submit() {
    if (!form.name.trim()) { setError('이름을 입력해주세요'); return }
    if (!form.cohort.trim()) { setError('간사 기수를 입력해주세요'); return }
    if (!form.district.trim()) { setError('소속 지구를 입력해주세요'); return }
    if (!form.campus.trim()) { setError('주 사역 캠퍼스를 입력해주세요'); return }
    if (form.attending === null) { setError('참석 여부를 선택해주세요'); return }
    if (!form.attending) {
      if (!form.absent_reason.trim()) { setError('불참 사유를 입력해주세요'); return }
    } else {
      if (!form.phone.trim()) { setError('연락처를 입력해주세요'); return }
      if (!form.gender) { setError('성별을 선택해주세요'); return }
      if (!form.id_number.trim()) { setError('주민등록번호를 입력해주세요'); return }
      if (!form.attendance_type) { setError('참석 형태를 선택해주세요'); return }
      if (!form.transportation) { setError('이동 수단을 선택해주세요'); return }
      if (!form.consent) { setError('개인정보 수집·이용에 동의해주세요'); return }
    }
    setError(''); setSubmitting(true)
    const allChallenges = [...form.challenges, ...(form.challenge_other.trim() ? [form.challenge_other.trim()] : [])]
    const supabase = createClient()
    const { error: err } = await supabase.from('forum_registrations').insert([{
      name: form.name, cohort: form.cohort, district: form.district, campus: form.campus, phone: form.phone,
      attending: form.attending, absent_reason: form.absent_reason,
      attendance_type: form.attendance_type, transportation: form.transportation,
      carpool_seats: form.carpool_seats, room_note: form.room_note,
      gender: form.gender, id_number: form.id_number,
      challenges: allChallenges, desired_topic: form.desired_topic, questions: form.questions,
      registered_at: new Date().toISOString(),
    }])
    setSubmitting(false)
    if (err) { setError('제출 중 오류가 발생했습니다. 다시 시도해주세요.') }
    else { setStep('done') }
  }

  const isAttending = form.attending === true
  const isAbsent = form.attending === false
  const isCarpoolOk = form.transportation === '자차 이용 (카풀 가능)'

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="border border-[#7c5cfc]/25 rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[92svh] flex flex-col" style={{ background: '#1a0f3a' }}>
        {step === 'form' ? (
          <>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
              <div>
                <h2 className="text-[#a78bfa] font-black text-xl">✍️ 교육간사포럼 등록</h2>
                <p className="text-white/40 text-xs mt-0.5">2026 CCC SLM 교육간사 포럼 · 참가 신청 및 사전 설문</p>
              </div>
              <button onClick={onClose} className="text-white/40 text-3xl leading-none pb-1">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

              <SectionHeader label="기본 정보 및 참석 여부" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="이름" required>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="홍길동" className={INPUT_CLS} />
                </Field>
                <Field label="간사 기수" required>
                  <div>
                    <input value={form.cohort}
                      onChange={e => set('cohort', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="43" inputMode="numeric" className={INPUT_CLS} />
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="소속 지구" required>
                  <input value={form.district} onChange={e => set('district', e.target.value)} placeholder="서울지구" className={INPUT_CLS} />
                </Field>
                <Field label="사역 캠퍼스" required>
                  <input value={form.campus} onChange={e => set('campus', e.target.value)} placeholder="OO대학교" className={INPUT_CLS} />
                </Field>
              </div>
              <Field label="이번 교육간사 포럼에 참석하십니까?" required>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => set('attending', true)}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all ${isAttending ? 'bg-[#7c5cfc] border-[#7c5cfc] text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>
                    예, 참석합니다
                  </button>
                  <button type="button" onClick={() => set('attending', false)}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all ${isAbsent ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>
                    아쉽지만 불참
                  </button>
                </div>
              </Field>

              {isAbsent && (
                <>
                  <SectionHeader label="불참 사유" />
                  <Field label="간략한 불참 사유를 남겨주세요" required hint="다음 포럼 기획에 참고합니다">
                    <textarea value={form.absent_reason} onChange={e => set('absent_reason', e.target.value)}
                      placeholder="예: 타 사역 일정 중복, 개인 연차, 건강상 이유 등" rows={3} className={INPUT_CLS + ' resize-none'} />
                  </Field>
                </>
              )}

              {isAttending && (
                <>
                  <SectionHeader label="참석자 상세 정보" />
                  <Field label="연락처" required>
                    <input value={form.phone}
                      onChange={e => set('phone', formatPhone(e.target.value))}
                      placeholder="010-1234-5678" type="tel" inputMode="numeric" className={INPUT_CLS} />
                  </Field>
                  <Field label="성별" required hint="숙소 배정용">
                    <div className="grid grid-cols-2 gap-2">
                      {['남성', '여성'].map(opt => (
                        <button key={opt} type="button" onClick={() => set('gender', opt)}
                          className={`py-3 rounded-xl text-sm font-bold border transition-all ${form.gender === opt ? 'bg-[#7c5cfc] border-[#7c5cfc] text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="주민등록번호" required hint="여행자 보험 가입용">
                    <input value={form.id_number}
                      onChange={e => set('id_number', formatIdNumber(e.target.value))}
                      placeholder="000000-0000000" inputMode="numeric" className={INPUT_CLS} />
                    <p className="text-white/25 text-xs mt-1">🔒 보험 처리 후 즉시 파기됩니다</p>
                  </Field>
                  <Field label="참석 형태" required>
                    <RadioGroup
                      options={['전 일정(1박 2일) 참석', '23일(1일 차)만 참석', '24일(2일 차)만 참석']}
                      value={form.attendance_type} onChange={v => set('attendance_type', v)} />
                  </Field>
                  <Field label="이동 수단" required>
                    <RadioGroup
                      options={['대중교통 이용', '자차 이용 (카풀 가능)', '자차 이용 (카풀 불가)', '타 지구/동역자 차량 카풀']}
                      value={form.transportation} onChange={v => set('transportation', v)} />
                    {isCarpoolOk && (
                      <input value={form.carpool_seats} onChange={e => set('carpool_seats', e.target.value)}
                        placeholder="카풀 가능 인원 (예: 3명)" className={INPUT_CLS + ' mt-2'} />
                    )}
                  </Field>
                  <Field label="숙소 배정 및 식사 관련 참고사항" hint="선택">
                    <textarea value={form.room_note} onChange={e => set('room_note', e.target.value)}
                      placeholder="알레르기 식단, 특이 질환, 룸메이트 관련 사전 조율 요청 사항 (없으면 비워두세요)"
                      rows={3} className={INPUT_CLS + ' resize-none'} />
                  </Field>
                </>
              )}

              {(isAttending || isAbsent) && (
                <>
                  <SectionHeader label="현장 사역 진단 및 기대 (선택)" />
                  <p className="text-white/40 text-xs -mt-2">포럼 기획 및 분반 토의 방향을 정하는 데 큰 도움이 됩니다. 가급적 응답 부탁드립니다.</p>
                  <Field label="현재 담당 사역지에서 겪는 가장 큰 고민 (복수 선택 가능)">
                    <div className="space-y-2">
                      {CHALLENGES.map(c => (
                        <label key={c} className="flex items-start gap-3 cursor-pointer" onClick={() => toggleChallenge(c)}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${form.challenges.includes(c) ? 'bg-[#7c5cfc] border-[#7c5cfc]' : 'border-white/30 bg-transparent'}`}>
                            {form.challenges.includes(c) && <span className="text-white text-xs font-black">✓</span>}
                          </div>
                          <span className="text-white/70 text-sm leading-snug">{c}</span>
                        </label>
                      ))}
                      <input value={form.challenge_other} onChange={e => set('challenge_other', e.target.value)}
                        placeholder="기타 (직접 입력)" className={INPUT_CLS + ' mt-1'} />
                    </div>
                  </Field>
                  <Field label="SLM HQ에 하고 싶은 말" hint="선택">
                    <textarea value={form.questions} onChange={e => set('questions', e.target.value)}
                      placeholder="자유롭게 적어주세요" rows={3} className={INPUT_CLS + ' resize-none'} />
                  </Field>
                  {isAttending && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <p className="text-white/60 text-xs font-bold">📋 개인정보 수집·이용 동의 (필수)</p>
                      <p className="text-white/40 text-xs leading-relaxed">
                        수집 목적: 행사 운영, 비상 연락, 숙소/차량 배정{'\n'}
                        수집 항목: 성명, 연락처 등{'\n'}
                        보유 기간: 포럼 종료 후 <span className="text-[#a78bfa] font-bold">즉시 파기</span>
                      </p>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div onClick={() => set('consent', !form.consent)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${form.consent ? 'bg-[#7c5cfc] border-[#7c5cfc]' : 'border-white/30 bg-transparent'}`}>
                          {form.consent && <span className="text-white text-xs font-black">✓</span>}
                        </div>
                        <span className="text-white/80 text-sm">동의합니다</span>
                      </label>
                      <p className="text-white/25 text-xs">* 동의하지 않으실 경우 참가가 제한됩니다</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-6 pb-8 pt-3 shrink-0 border-t border-white/5">
              {error && <p className="text-red-500 text-xs mb-2 text-center">{error}</p>}
              <button onClick={submit} disabled={submitting}
                className="w-full btn-gold py-4 rounded-2xl font-black text-base disabled:opacity-40">
                {submitting ? '제출 중...' : '제출하기 →'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center p-8 py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-[#a78bfa] font-black text-2xl mb-2">제출 완료!</h2>
            <p className="text-white/70 text-sm leading-relaxed">응답해주셔서 감사합니다.<br/>{form.attending ? '포럼에서 만나요!' : '다음 기회에 함께해요!'}</p>
            <p className="text-white/30 text-xs mt-4">문의: 김양연 간사 010-9154-6113</p>
            <button onClick={onClose} className="mt-6 btn-gold px-8 py-3 rounded-xl font-bold">확인</button>
          </div>
        )}
      </div>
    </div>
  )
}
