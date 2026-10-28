"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TEACHERS = [
  '박예찬', '김근태', '이지연', '나미애', '노성우',
  '이보람', '김인혁', '이정현', '차태현', '이하원',
  '신다은', '전지연', '성은진', '안우림',
]
const TEACHER_PW = '9182'

const YEAR = 365 * 24 * 60 * 60
function setCookie(key: string, value: string) {
  const exp = new Date(Date.now() + YEAR * 1000).toUTCString()
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${exp}; path=/`
}
function getCookie(key: string) {
  const match = document.cookie.split('; ').find(c => c.startsWith(key + '='))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}
function delCookie(key: string) {
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}
function saveAuth(name: string) {
  localStorage.setItem('admin_auth', 'true')
  localStorage.setItem('teacher_name', name)
  setCookie('admin_auth', 'true')
  setCookie('teacher_name', name)
}
function getAuth() {
  let authed = localStorage.getItem('admin_auth') === 'true'
  let name = localStorage.getItem('teacher_name') || ''
  if (!authed || !name) {
    const cAuth = getCookie('admin_auth') === 'true'
    const cName = getCookie('teacher_name') || ''
    if (cAuth && cName) {
      localStorage.setItem('admin_auth', 'true')
      localStorage.setItem('teacher_name', cName)
      authed = true
      name = cName
    }
  }
  return { authed, name }
}
const HONORIFICS: Record<string, string> = {
  '박예찬': '목사님',
  '김근태': '부장님',
}
function getHonorific(name: string) {
  return HONORIFICS[name] || '선생님'
}

export default function ForumLanding() {
  const [mode, setMode] = useState<'home' | 'teacher' | 'special'>('home')
  const [visible, setVisible] = useState(false)
  const [regCount, setRegCount] = useState<number | null>(null)
  const [noticePopup, setNoticePopup] = useState<{ id: string; title: string; content?: string } | null>(null)
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [unreadQueue, setUnreadQueue] = useState<{ id: string; title: string; content?: string }[]>([])

  const isInstalled =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as { standalone?: boolean }).standalone)
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isKakao = /KAKAOTALK|kakaotalk/i.test(ua)
  const isInAppBrowser = isKakao || /FB_IAB|FBAN|Instagram|Line|NAVER|Whale/i.test(ua)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('special')) {
      const { authed, name } = getAuth()
      if (authed && name) setMode('special')
    }
  }, [])

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setInstallPrompt(e as unknown as typeof installPrompt)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    fetchCount()
    fetchUnread()
    return () => clearTimeout(t)
  }, [])

  async function fetchCount() {
    const supabase = createClient()
    const { data } = await supabase
      .from('students').select('id').not('registered_at', 'is', null)
    if (data) setRegCount(data.length)
  }

  async function fetchUnread() {
    const supabase = createClient()
    const seen = JSON.parse(localStorage.getItem('seen_notices') || '[]')
    const { data } = await supabase
      .from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false })
    if (data) {
      const unreadList = data.filter((a: { id: string }) => !seen.includes(a.id))
      const count = unreadList.length
      setUnreadQueue(unreadList)
      if (unreadList.length > 0) setNoticePopup(unreadList[0])
      if ('setAppBadge' in navigator) {
        if (count > 0) (navigator as { setAppBadge: (n: number) => void }).setAppBadge(count)
        else (navigator as { clearAppBadge: () => void }).clearAppBadge()
      }
    }
  }

  function dismissNotice(id: string) {
    const seen = JSON.parse(localStorage.getItem('seen_notices') || '[]')
    localStorage.setItem('seen_notices', JSON.stringify([...seen, id]))
    const remaining = unreadQueue.filter(a => a.id !== id)
    setUnreadQueue(remaining)
    setNoticePopup(remaining.length > 0 ? remaining[0] : null)
    if (remaining.length === 0 && 'clearAppBadge' in navigator)
      (navigator as { clearAppBadge: () => void }).clearAppBadge()
  }

  function enterParent() {
    window.location.href = '/forum/home'
  }

  function enterTeacher() {
    const { authed, name } = getAuth()
    if (authed && name) {
      const FULL = ['나미애', '박예찬']
      if (FULL.includes(name)) {
        setMode('special')
      } else {
        window.location.href = '/forum/admin'
      }
    } else {
      setMode('teacher')
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      {/* 배경 이미지 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hero-mobile.png" alt="" className="absolute inset-0 w-full h-full object-cover object-center md:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hero-desktop.png" alt="" className="absolute inset-0 w-full h-full object-cover object-center hidden md:block" />
      {/* 하단 밝은 그라데이션 */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(232,244,255,0.85) 72%, #e8f4ff 100%)'
      }} />

      {/* 콘텐츠 */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-1" />
        <div className="px-5 pb-12 space-y-3 max-w-md mx-auto w-full"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.7s ease 0.3s' }}>
          {mode === 'home' ? (
            <>
              {/* 등록현황 */}
              <div className="flex justify-center mb-1">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 shadow-sm border border-[#0284c7]/20">
                  <span className="text-sm">✍️</span>
                  <span className="text-black/50 text-xs">현재 등록</span>
                  <span className="text-[#0369a1] font-black text-sm">{regCount === null ? '-' : regCount}명</span>
                  <span className="text-black/30 text-xs">/ 50명</span>
                </div>
              </div>
              <button onClick={enterParent}
                className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 relative overflow-hidden text-white"
                style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', boxShadow: '0 6px 24px rgba(3,105,161,0.4)' }}>
                <span className="absolute inset-0 pointer-events-none" style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                  animation: 'shimmer 2.5s infinite',
                }} />
                <span>교육간사 포럼 입장</span>
              </button>

              {/* 홈 화면 설치 버튼 */}
              {!isInstalled && (
                (isAndroid && installPrompt) ? (
                  <>
                    <button onClick={async () => {
                      installPrompt.prompt()
                      const result = await installPrompt.userChoice
                      if (result.outcome === 'accepted') setInstallPrompt(null)
                    }}
                      className="w-full py-3 rounded-2xl text-sm font-bold text-black/50 bg-white/60 border border-black/10 flex items-center justify-center gap-2">
                      📲 여름성경학교 앱 설치
                    </button>
                    <p className="text-black/35 text-xs text-center px-2">설치 시 보안 경고가 뜨면 <strong>&quot;무시하고 설치&quot;</strong>를 눌러주세요 — 안전한 앱입니다 ✅</p>
                  </>
                ) : isIOS ? (
                  <button onClick={() => setShowIOSGuide(true)}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-black/50 bg-white/60 border border-black/10 flex items-center justify-center gap-2">
                    📲 여름성경학교 앱 설치
                  </button>
                ) : null
              )}
            </>
          ) : mode === 'special' ? (
            <SpecialMenu name={typeof window !== 'undefined' ? localStorage.getItem('teacher_name') || '' : ''} onBack={() => setMode('home')} />
          ) : (
            <TeacherLogin onBack={() => setMode('home')} />
          )}
        </div>
      </div>

      {/* iOS 설치 안내 팝업 */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowIOSGuide(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-[#0369a1] font-black text-lg text-center">📲 여름성경학교 앱 설치</p>
            {isInAppBrowser ? (
              <>
                <p className="text-black/50 text-xs text-center">카카오톡에서는 Safari로 먼저 열어주세요</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-[#e8f4ff] rounded-2xl p-3">
                    <span className="text-xl shrink-0">1️⃣</span>
                    <p className="text-black/70 text-sm">우측 하단 <strong>공유 버튼 ⬆️</strong> 탭</p>
                  </div>
                  <div className="flex items-center gap-3 bg-[#e8f4ff] rounded-2xl p-3">
                    <span className="text-xl shrink-0">2️⃣</span>
                    <p className="text-black/70 text-sm"><strong>&quot;Safari로 열기&quot;</strong> 선택</p>
                  </div>
                  <div className="flex items-center gap-3 bg-[#e8f4ff] rounded-2xl p-3">
                    <span className="text-xl shrink-0">3️⃣</span>
                    <p className="text-black/70 text-sm">Safari에서 공유 ⬆️ → <strong>&quot;홈 화면에 추가&quot;</strong></p>
                  </div>
                </div>
                <CopyURLButton />
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-[#e8f4ff] rounded-2xl p-3">
                  <span className="text-xl shrink-0">1️⃣</span>
                  <p className="text-black/70 text-sm">주소창 옆 <strong>··· 버튼</strong> 탭</p>
                </div>
                <div className="flex items-center gap-3 bg-[#e8f4ff] rounded-2xl p-3">
                  <span className="text-xl shrink-0">2️⃣</span>
                  <p className="text-black/70 text-sm"><strong>공유</strong> 선택</p>
                </div>
                <div className="flex items-center gap-3 bg-[#e8f4ff] rounded-2xl p-3">
                  <span className="text-xl shrink-0">3️⃣</span>
                  <p className="text-black/70 text-sm"><strong>&quot;홈 화면에 추가&quot;</strong> 선택 후 추가!</p>
                </div>
              </div>
            )}
            <button onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>확인</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* 공지 팝업 */}
      {noticePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => dismissNotice(noticePopup.id)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📢</span>
              <span className="text-[#0369a1] font-black text-base">공지사항</span>
            </div>
            <p className="font-bold text-[#1a1008] text-sm mb-2">{noticePopup.title}</p>
            {noticePopup.content && <p className="text-black/60 text-sm leading-relaxed mb-4">{noticePopup.content}</p>}
            <button onClick={() => dismissNotice(noticePopup.id)}
              className="w-full py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#0284c7,#0369a1)' }}>
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CopyURLButton() {
  const [copied, setCopied] = useState(false)
  const url = 'https://vbs2026.vercel.app'
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="bg-black/5 rounded-2xl p-3 space-y-2">
      <p className="text-black/40 text-xs text-center">또는 주소 복사 후 Safari에 붙여넣기</p>
      <div className="flex gap-2 items-center">
        <p className="flex-1 text-[#0369a1] font-mono text-xs bg-white rounded-xl px-3 py-2 truncate">{url}</p>
        <button onClick={copy}
          className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${copied ? 'bg-green-500 text-white' : 'bg-[#0369a1] text-white'}`}>
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>
    </div>
  )
}

function TeacherLogin({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [isNamiae, setIsNamiae] = useState(false)

  function login() {
    if ((name.trim() === '나미애' || name.trim() === '박예찬') && pw === TEACHER_PW) {
      saveAuth(name.trim())
      setIsNamiae(true)
      return
    }
    if (!TEACHERS.includes(name.trim())) {
      setError('이름을 확인해주세요')
      return
    }
    if (pw !== TEACHER_PW) {
      setError('비밀번호가 틀렸습니다')
      return
    }
    saveAuth(name.trim())
    window.location.href = '/forum/admin'
  }

  if (isNamiae) {
    return <SpecialMenu name={typeof window !== 'undefined' ? localStorage.getItem('teacher_name') || '' : ''} onBack={onBack} />
  }

  const INPUT = "w-full bg-white border border-[#0284c7]/25 rounded-xl px-4 py-3.5 text-[#0c1a26] placeholder-black/30 outline-none focus:border-[#0284c7]/60 text-sm"

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <p className="text-[#0369a1] font-black text-xl">선생님 입장</p>
        <p className="text-black/40 text-xs mt-1">이름과 비밀번호를 입력해주세요</p>
      </div>
      <div>
        <label className="text-black/50 text-xs mb-1.5 block">이름</label>
        <input value={name} onChange={e => { setName(e.target.value); setError('') }}
          placeholder="" className={INPUT} list="teacher-list" />
        <datalist id="teacher-list">
          {TEACHERS.map(t => <option key={t} value={t} />)}
        </datalist>
      </div>
      <div>
        <label className="text-black/50 text-xs mb-1.5 block">비밀번호</label>
        <input value={pw} onChange={e => { setPw(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && login()}
          type="password" placeholder=""
          className={INPUT + ' text-center text-xl tracking-widest'} />
      </div>
      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
      <button onClick={login}
        className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all"
        style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', boxShadow: '0 4px 16px rgba(3,105,161,0.3)' }}>
        입장하기
      </button>
      <button onClick={onBack} className="w-full text-black/30 text-sm py-2">← 뒤로</button>
    </div>
  )
}

function SpecialMenu({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <p className="text-[#0369a1] font-black text-xl">👋 {name} {getHonorific(name)}</p>
        <p className="text-black/40 text-xs mt-1">어디로 이동할까요?</p>
      </div>
      <button onClick={() => { window.location.href = '/forum/admin' }}
        className="w-full bg-white py-5 rounded-2xl font-bold text-[#0369a1] text-base border border-[#0284c7]/25 hover:border-[#0284c7]/50 transition-all"
        style={{ boxShadow: '0 2px 8px rgba(3,105,161,0.1)' }}>
        ⚔️ 선생님 관리 페이지
      </button>
      <button onClick={() => { window.location.href = '/forum/ledger' }}
        className="w-full py-5 rounded-2xl font-black text-base text-white"
        style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', boxShadow: '0 4px 16px rgba(3,105,161,0.3)' }}>
        💰 회계선생님 전용
      </button>
      <button onClick={onBack} className="w-full text-black/30 text-sm py-2">← 뒤로</button>
    </div>
  )
}
