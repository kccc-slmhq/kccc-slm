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

const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6', '선생님', '봉사자']
const STAFF_GRADES = ['선생님', '봉사자']
const T_SIZES = ['110', '120', '130', '140', '150', 'SS', 'S', 'M', 'L', 'LL', '3L', '4L']

const ACCOUNT = '3333-29-2677428'
const BANK = '카카오뱅크'
const HOLDER = '박예찬'

const INPUT_CLS = "w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#7c5cfc]/70 text-sm"

export default function ForumHome() {
  const [activeDay, setActiveDay] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [regOverride, setRegOverride] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('announcements').select('content').eq('title', '__reg_open__').maybeSingle()
      .then(({ data }) => { if (data && data.content === todayKST()) setRegOverride(true) })
  }, [])

  const isClosed = !regOverride && new Date() >= DEADLINE

  return (
    <div className="min-h-screen bg-[#0f0830]">
      {/* Hero Section - poster image */}
      <div className="relative w-full" style={{ aspectRatio: '9/16', maxHeight: '60vw' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/forum-poster.webp" alt="교육간사 포럼"
          className="w-full h-full object-cover object-top"
          onError={e => (e.currentTarget.style.display = 'none')} />
        <div className="absolute bottom-0 left-0 right-0 h-24"
          style={{ background: 'linear-gradient(to bottom, transparent, #0f0830)' }} />
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">

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
            <a href="https://naver.me/5vJUGSbp"
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col gap-2 card-dark rounded-2xl p-4 active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl border border-purple-200">🏨</div>
              <div>
                <p className="text-white font-bold text-sm leading-snug">머무는 숙소</p>
                <p className="text-white/40 text-xs mt-0.5">경기 수원시 팔달구 인계로 116</p>
                <p className="text-[#4dd9ff] text-xs font-bold mt-1">네이버 지도 →</p>
              </div>
            </a>
            <a href="https://naver.me/FOR75yzX"
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col gap-2 card-dark rounded-2xl p-4 active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-900/50 flex items-center justify-center text-xl border border-purple-500/30">🗺️</div>
              <div>
                <p className="text-white font-bold text-sm leading-snug">한국대학생선교회 비전센터</p>
                <p className="text-white/40 text-xs mt-0.5">경기 수원시 권선구 새터로23번길 12-6</p>
                <p className="text-[#4dd9ff] text-xs font-bold mt-1">네이버 지도 →</p>
              </div>
            </a>
          </div>
        </section>

        {/* 포럼 아카이브 */}
        <section>
          <h2 className="text-[#a78bfa] font-bold text-lg mb-3 flex items-center gap-2">
            <span>📁</span> 교육간사 포럼 아카이브
          </h2>
          <a href="https://drive.google.com/drive/folders/1PXEK9gk8eUhMXJqWHlppsUMrW5oHxO5r?usp=sharing"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 card-dark rounded-2xl p-5 active:scale-95 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-900/50 flex items-center justify-center shrink-0 text-2xl border border-purple-500/30">📂</div>
            <div>
              <p className="text-white font-bold">자료 보러 가기</p>
              <p className="text-white/50 text-xs mt-0.5">포럼 자료 및 아카이브</p>
              <p className="text-[#a78bfa] text-xs font-bold mt-1">드라이브 열기 →</p>
            </div>
          </a>
        </section>

        {/* 여행자보험 */}
        <section>
          <h2 className="text-[#a78bfa] font-bold text-lg mb-3 flex items-center gap-2">
            <span>🛡️</span> 여행자보험
          </h2>
          <div className="card-dark rounded-2xl p-4 space-y-3">
            <div className="space-y-1.5">
              <p className="text-white/80 text-sm font-medium">🛡️ 교회에서 단체 여행자보험에 가입해 드립니다.</p>
              <p className="text-white/55 text-sm">사고·부상 시 <span className="font-bold text-white">한화손보 모바일 앱</span>으로 보험금 신청 가능</p>
              <p className="text-white/35 text-xs">※ 보험 가입 여부는 등록 완료 후 개별 안내</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold mb-2">보험금 신청 앱 설치</p>
              <div className="grid grid-cols-2 gap-3">
                <a href="https://play.google.com/store/apps/details?id=com.hanwha.hima&hl=ko"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-xl py-3 font-bold text-sm transition-all active:scale-95 bg-[#7c5cfc] text-white">
                  Android
                </a>
                <a href="https://apps.apple.com/kr/app/%ED%95%9C%ED%99%94%EC%86%90%EB%B3%B4-%EB%AA%A8%EB%B0%94%EC%9D%BC-%EC%95%B1/id959889713"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-xl py-3 font-bold text-sm transition-all active:scale-95 bg-[#0c1a26] text-white">
                  iPhone
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

      <FloatingRegisterBtn onClick={() => isClosed ? setShowClosed(true) : setShowModal(true)} />

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
    </div>
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
            <p className="text-[#a78bfa] font-bold text-sm">🎉 준비 완료! 수련회에서 보자! 🤙</p>
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
          <InfoRow icon={<span>📅</span>} label="일시" value="2026년 11월 23일(월) ~ 24일(화)" />
          <InfoRow icon={<span>📍</span>} label="장소" value="수원 CCC 회관" />
          <InfoRow icon={<span>✝️</span>} label="주제" value={<>가르쳐 지키게 하라<br /><span className="text-white/40 text-xs font-normal">📖 마태복음 28:20a</span></>} />
          <InfoRow icon={<span>👥</span>} label="대상" value="SLM 교육간사" />
          <InfoRow icon={<span>💳</span>} label="회비" value="50,000원" />
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
            onKeyDown={e => e.key === 'Enter' && ask()}
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

function FloatingRegisterBtn({ onClick }: { onClick: () => void }) {
  const [offset, setOffset] = useState(0)
  const lastScrollY = React.useRef(0)
  const ticking = React.useRef(false)

  useEffect(() => {
    function onScroll() {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const delta = window.scrollY - lastScrollY.current
          setOffset(prev => Math.max(-8, Math.min(8, prev + delta * 0.15)))
          lastScrollY.current = window.scrollY
          ticking.current = false
        })
        ticking.current = true
      }
    }
    let timer: ReturnType<typeof setTimeout>
    function onScrollEnd() {
      clearTimeout(timer)
      timer = setTimeout(() => setOffset(0), 120)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScrollEnd, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScrollEnd)
    }
  }, [])

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-5"
      style={{ transform: `translateY(${offset}px)`, transition: offset === 0 ? 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.08s ease-out' }}>
      <button onClick={onClick}
        className="w-full btn-gold py-4 rounded-2xl font-black text-lg flex flex-col items-center justify-center gap-0.5"
        style={{ boxShadow: '0 8px 36px rgba(124,92,252,0.5)' }}>
        <span className="flex items-center gap-2"><span>✍️</span> 교육간사포럼 등록하기</span>
        <span className="text-xs font-semibold opacity-80">📅 등록 마감 11월 15일</span>
      </button>
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

function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt}
        onError={e => { if (e.currentTarget.parentElement) e.currentTarget.parentElement.style.display = 'none' }}
        onClick={() => setOpen(true)}
        className="w-full h-32 object-cover cursor-zoom-in active:scale-95 transition-all" />
      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/85" onClick={() => setOpen(false)}>
          <p className="text-white/50 text-xs mb-3">화면을 탭하면 닫힙니다</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-w-full max-h-[80vh] object-contain rounded-xl px-4" />
        </div>
      )}
    </>
  )
}

type Participant = { name: string; grade: string; tshirt_size: string; id_number: string; allergy: string; note: string }
const EMPTY_PARTICIPANT: Participant = { name: '', grade: '초1', tshirt_size: '', id_number: '', allergy: '', note: '' }

export function RegisterModal({ onClose }: { onClose: () => void }) {
  const [isSibling, setIsSibling] = useState(false)
  const [sibCount, setSibCount] = useState(2)
  const [activeTab, setActiveTab] = useState(0)
  const [participants, setParticipants] = useState<Participant[]>([{ ...EMPTY_PARTICIPANT }])
  const [parent, setParent] = useState({ parent_name: '', parent_phone: '' })
  const [agreed, setAgreed] = useState(false)
  const [step, setStep] = useState('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleSibling() {
    const next = !isSibling
    setIsSibling(next)
    if (next) {
      setParticipants(Array.from({ length: 2 }, () => ({ ...EMPTY_PARTICIPANT })))
      setActiveTab(0)
    } else {
      setParticipants([{ ...EMPTY_PARTICIPANT }])
      setActiveTab(0)
    }
  }

  function changeSibCount(n: number) {
    setSibCount(n)
    setParticipants(prev => {
      const arr = [...prev]
      while (arr.length < n) arr.push({ ...EMPTY_PARTICIPANT })
      return arr.slice(0, n)
    })
    setActiveTab(t => Math.min(t, n - 1))
  }

  function setP(idx: number, field: keyof Participant, value: string) {
    setParticipants(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const curP = participants[activeTab] || EMPTY_PARTICIPANT
  const isStaff = STAFF_GRADES.includes(curP.grade)

  async function submit() {
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i]
      const label = isSibling ? `참석자 ${i + 1}` : '참석자'
      if (!p.name.trim()) { setError(`${label} 이름을 입력해주세요`); setActiveTab(i); return }
      if (!p.tshirt_size) { setError(`${label} 티셔츠 사이즈를 선택해주세요`); setActiveTab(i); return }
      if (!p.id_number.trim()) { setError(`${label} 주민등록번호를 입력해주세요`); setActiveTab(i); return }
    }
    if (!parent.parent_phone.trim()) { setError('연락처를 입력해주세요'); return }
    if (!agreed) { setError('개인정보 수집·이용에 동의해주세요'); return }
    setError(''); setSubmitting(true)
    const eligibleCount = participants.filter(p => !STAFF_GRADES.includes(p.grade)).length
    const applyDiscount = isSibling && eligibleCount >= 2
    const rows = participants.map(p => ({
      name: p.name, grade: p.grade,
      parent_name: parent.parent_name,
      parent_phone: parent.parent_phone,
      tshirt_size: p.tshirt_size,
      id_number: p.id_number,
      allergy: p.allergy, note: p.note,
      sibling_discount: !STAFF_GRADES.includes(p.grade) && applyDiscount,
      registered_at: new Date().toISOString(),
    }))
    const supabase = createClient()
    const { error: err } = await supabase.from('students').insert(rows)
    setSubmitting(false)
    if (err) { setError('등록 중 오류가 발생했습니다. 다시 시도해주세요.') }
    else { setStep('done') }
  }

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
                <p className="text-white/40 text-xs mt-0.5">2026 CCC SLM 교육간사 포럼</p>
              </div>
              <button onClick={onClose} className="text-white/40 text-3xl leading-none pb-1">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <button type="button" onClick={toggleSibling}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${isSibling ? 'bg-[#2d1a6e] border-[#7c5cfc]/50' : 'bg-[#1a0f3a] border-[#7c5cfc]/20'}`}>
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSibling ? 'bg-[#7c5cfc] border-[#7c5cfc]' : 'border-white/20'}`}>
                  {isSibling && <span className="text-white text-xs font-black">✓</span>}
                </div>
                <div>
                  <p className={`text-sm font-bold ${isSibling ? 'text-[#a78bfa]' : 'text-white/60'}`}>👨‍👩‍👧‍👦 형제·자매 함께 등록 시 체크 (할인 적용)</p>
                  <p className="text-xs text-white/40 mt-0.5">각 10,000원 할인 → 1인당 <span className={`font-bold ${isSibling ? 'text-[#a78bfa]' : ''}`}>{isSibling ? '40,000원' : '50,000원'}</span></p>
                </div>
              </button>
              {isSibling && (
                <div className="flex gap-2">
                  {[2, 3].map(n => (
                    <button key={n} onClick={() => changeSibCount(n)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${sibCount === n ? 'btn-gold' : 'bg-white/5 text-white/50 border border-white/10'}`}>{n}명 등록</button>
                  ))}
                </div>
              )}
              {isSibling && (
                <div className="flex gap-1">
                  {participants.map((_, i) => (
                    <button key={i} onClick={() => setActiveTab(i)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === i ? 'bg-[#7c5cfc] text-white' : 'bg-white/5 text-white/50 border border-white/10'}`}>참석자 {i + 1}</button>
                  ))}
                </div>
              )}
              <p className="text-[#a78bfa]/70 text-xs font-bold tracking-widest uppercase">
                {isSibling ? `참석자 ${activeTab + 1} 정보` : '참석자 정보'}
              </p>
              <Field label="이름" required>
                <input value={curP.name} onChange={e => setP(activeTab, 'name', e.target.value)} placeholder="홍길동" className={INPUT_CLS} />
              </Field>
              <Field label="학년" required>
                <SelectDrop value={curP.grade} onChange={v => setP(activeTab, 'grade', v)} options={GRADES} placeholder="학년 선택" />
              </Field>
              <Field label="티셔츠 사이즈" required>
                <div className="grid grid-cols-2 gap-2 mb-2 rounded-xl overflow-hidden border border-black/8">
                  <ImageZoom src="/tshirt.jpg" alt="수련회 티셔츠" />
                  <ImageZoom src="/sizechart.jpg" alt="사이즈 표" />
                </div>
                <p className="text-white/35 text-xs mb-2">👆 사진을 누르시면 자세히 볼 수 있습니다</p>
                <SelectDrop value={curP.tshirt_size} onChange={v => setP(activeTab, 'tshirt_size', v)} options={T_SIZES} placeholder="사이즈 선택" />
              </Field>
              <Field label="알레르기 / 건강사항" hint="없으면 비워두세요">
                <textarea value={curP.allergy} onChange={e => setP(activeTab, 'allergy', e.target.value)} placeholder="예) 땅콩 알레르기, 천식 등" rows={2} className={INPUT_CLS + ' resize-none'} />
              </Field>
              <Field label="주민등록번호" required hint="여행자 보험 가입용">
                <input value={curP.id_number} onChange={e => setP(activeTab, 'id_number', e.target.value)} placeholder="000000-0000000" className={INPUT_CLS} />
                <p className="text-white/25 text-xs mt-1">🔒 보험 처리 후 즉시 폐기됩니다</p>
              </Field>
              <Field label="기타 사항" hint="선택">
                <textarea value={curP.note} onChange={e => setP(activeTab, 'note', e.target.value)} placeholder="담당 선생님께 전달할 내용" rows={2} className={INPUT_CLS + ' resize-none'} />
              </Field>
              {isSibling && activeTab < participants.length - 1 && (
                <button onClick={() => setActiveTab(activeTab + 1)}
                  className="w-full py-3 rounded-xl text-sm font-bold text-[#a78bfa] bg-purple-900/40 border border-[#7c5cfc]/25 transition-all">
                  다음 참석자 {activeTab + 2} 정보 입력 →
                </button>
              )}
              {(!isSibling || activeTab === participants.length - 1) && (
                <>
                  <p className="text-[#a78bfa]/70 text-xs font-bold tracking-widest uppercase pt-2">
                    {isStaff ? '연락처' : '보호자 정보'}
                  </p>
                  {!isStaff && (
                    <Field label="보호자 이름">
                      <input value={parent.parent_name} onChange={e => setParent(p => ({...p, parent_name: e.target.value}))} placeholder="김철수" className={INPUT_CLS} />
                    </Field>
                  )}
                  <Field label={!isStaff ? '비상 연락처' : '연락처'} required>
                    <input value={parent.parent_phone} onChange={e => setParent(p => ({...p, parent_phone: e.target.value}))} placeholder="010-0000-0000" type="tel" className={INPUT_CLS} />
                  </Field>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <p className="text-white/60 text-xs font-bold">📋 개인정보 수집·이용 동의</p>
                    <p className="text-white/40 text-xs leading-relaxed">
                      수집 항목: 이름, 학년, 보호자 연락처, 주민등록번호, 건강 정보{'\n'}
                      수집 목적: 성경학교 운영, 여행자 보험 가입, 비상 연락{'\n'}
                      보유 기간: 행사 종료 후 <span className="text-[#a78bfa] font-bold">즉시 폐기</span>
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div onClick={() => setAgreed(v => !v)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${agreed ? 'bg-[#7c5cfc] border-[#7c5cfc]' : 'border-white/30 bg-transparent'}`}>
                        {agreed && <span className="text-white text-xs font-black">✓</span>}
                      </div>
                      <span className="text-white/80 text-sm font-medium">위 내용을 확인하였으며 동의합니다</span>
                    </label>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 pb-8 pt-3 shrink-0 border-t border-white/5">
              {error && <p className="text-red-500 text-xs mb-2 text-center">{error}</p>}
              {(!isSibling || activeTab === participants.length - 1) ? (
                <button onClick={submit} disabled={submitting}
                  className="w-full btn-gold py-4 rounded-2xl font-black text-base disabled:opacity-40">
                  {submitting ? '등록 중...' : isSibling ? `${participants.length}명 등록 완료하기 →` : '등록 완료하기 →'}
                </button>
              ) : (
                <button onClick={() => setActiveTab(activeTab + 1)}
                  className="w-full btn-gold py-4 rounded-2xl font-black text-base">
                  참석자 {activeTab + 2} 정보 입력 →
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center p-8 py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-[#a78bfa] font-black text-2xl mb-2">등록 완료!</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              {isSibling
                ? <><span className="font-bold">{participants.map(p => p.name).join(', ')}</span><br/>총 {participants.length}명 등록이 완료되었습니다.</>
                : <><span className="font-bold">{participants[0]?.name}</span> 학생의 등록이 완료되었습니다.</>
              }
            </p>
            <p className="text-white/30 text-xs mt-4">수집된 개인정보는 행사 종료 후 즉시 폐기됩니다.<br/>문의: 김양연 간사 010-9154-6113</p>
            <button onClick={onClose} className="mt-6 btn-gold px-8 py-3 rounded-xl font-bold">확인</button>
          </div>
        )}
      </div>
    </div>
  )
}
