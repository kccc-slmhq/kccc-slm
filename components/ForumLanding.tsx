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
    <div className="min-h-screen flex flex-col"
      style={{
        opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease',
        background: 'linear-gradient(160deg, #1a0a4a 0%, #2d1b69 30%, #1e1060 60%, #0f0830 100%)',
      }}>
      {/* 네트워크 패턴 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="dot1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4dd9ff" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#4dd9ff" stopOpacity="0"/>
            </radialGradient>
          </defs>
          {/* 연결선들 */}
          <line x1="50" y1="80" x2="200" y2="150" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.4"/>
          <line x1="200" y1="150" x2="350" y2="60" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.4"/>
          <line x1="350" y1="60" x2="380" y2="200" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.3"/>
          <line x1="50" y1="80" x2="100" y2="280" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.3"/>
          <line x1="100" y1="280" x2="200" y2="150" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.3"/>
          <line x1="200" y1="150" x2="300" y2="320" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.25"/>
          <line x1="380" y1="200" x2="300" y2="320" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.25"/>
          <line x1="20" y1="500" x2="100" y2="280" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.2"/>
          <line x1="20" y1="500" x2="180" y2="580" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.2"/>
          <line x1="370" y1="480" x2="300" y2="320" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.2"/>
          <line x1="370" y1="480" x2="180" y2="580" stroke="#4dd9ff" strokeWidth="0.5" opacity="0.2"/>
          {/* 원형 패턴 우상단 */}
          <circle cx="340" cy="60" r="60" fill="none" stroke="#7c5cfc" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="340" cy="60" r="80" fill="none" stroke="#7c5cfc" strokeWidth="0.5" opacity="0.25"/>
          <circle cx="340" cy="60" r="100" fill="none" stroke="#7c5cfc" strokeWidth="0.5" opacity="0.15"/>
          {/* 원형 패턴 좌하단 */}
          <circle cx="60" cy="640" r="60" fill="none" stroke="#7c5cfc" strokeWidth="0.5" opacity="0.3"/>
          <circle cx="60" cy="640" r="80" fill="none" stroke="#7c5cfc" strokeWidth="0.5" opacity="0.2"/>
          {/* 점들 */}
          <circle cx="50" cy="80" r="3" fill="#4dd9ff" opacity="0.8"/>
          <circle cx="200" cy="150" r="4" fill="#4dd9ff" opacity="0.9"/>
          <circle cx="350" cy="60" r="3" fill="#4dd9ff" opacity="0.7"/>
          <circle cx="380" cy="200" r="2.5" fill="#4dd9ff" opacity="0.6"/>
          <circle cx="100" cy="280" r="2" fill="#4dd9ff" opacity="0.5"/>
          <circle cx="300" cy="320" r="5" fill="#4dd9ff" opacity="0.9"/>
          <circle cx="20" cy="500" r="4" fill="#4dd9ff" opacity="0.8"/>
          <circle cx="370" cy="480" r="3" fill="#4dd9ff" opacity="0.7"/>
          <circle cx="180" cy="580" r="2.5" fill="#4dd9ff" opacity="0.6"/>
        </svg>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-between px-6 py-12 max-w-sm mx-auto w-full">
        {/* 상단 헤더 텍스트 */}
        <div className="w-full text-center space-y-2 mt-4"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-16px)', transition: 'all 0.7s ease 0.1s' }}>
          <p className="text-white/60 text-xs tracking-[0.4em] font-medium uppercase">T E A C H I N G &nbsp; T H E M</p>
          <p className="font-black text-lg"
            style={{ background: 'linear-gradient(90deg, #4dd9ff 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CCC SLM 교육간사 포럼
          </p>
        </div>

        {/* 메인 타이틀 */}
        <div className="text-center"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.95)', transition: 'all 0.8s ease 0.2s' }}>
          <h1 className="font-black text-white leading-none"
            style={{ fontSize: 'clamp(64px, 22vw, 100px)', textShadow: '0 0 40px rgba(124,92,252,0.5)' }}>
            가르쳐<br/>지키게<br/>하라!!!
          </h1>
        </div>

        {/* 하단 영역 */}
        <div className="w-full space-y-4"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.7s ease 0.4s' }}>
          <p className="text-white/50 text-xs text-center leading-relaxed">
            내가 너희에게 분부한 모든 것을 가르쳐 지키게 하라 (마 28:20a)
          </p>

          {mode === 'home' ? (
            <>
              {regCount !== null && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <span className="text-white/50 text-xs">현재 등록</span>
                    <span className="font-black text-sm" style={{ background: 'linear-gradient(90deg,#4dd9ff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{regCount}명</span>
                    <span className="text-white/30 text-xs">/ 60명</span>
                  </div>
                </div>
              )}
              <button onClick={enterParent}
                className="w-full py-5 rounded-2xl font-black text-lg relative overflow-hidden text-white"
                style={{ background: 'linear-gradient(135deg, #7c5cfc, #4dd9ff)', boxShadow: '0 6px 32px rgba(124,92,252,0.5)' }}>
                <span className="absolute inset-0 pointer-events-none" style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                  animation: 'shimmer 2.5s infinite',
                }} />
                입장하기
              </button>

              {!isInstalled && (
                (isAndroid && installPrompt) ? (
                  <>
                    <button onClick={async () => {
                      installPrompt.prompt()
                      const result = await installPrompt.userChoice
                      if (result.outcome === 'accepted') setInstallPrompt(null)
                    }}
                      className="w-full py-3 rounded-2xl text-sm font-bold text-white/50 bg-white/10 border border-white/15 flex items-center justify-center gap-2">
                      📲 앱으로 설치하기
                    </button>
                  </>
                ) : isIOS ? (
                  <button onClick={() => setShowIOSGuide(true)}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white/50 bg-white/10 border border-white/15 flex items-center justify-center gap-2">
                    📲 앱으로 설치하기
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
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowIOSGuide(false)}>
          <div className="rounded-3xl w-full max-w-sm p-6 space-y-4" style={{ background: '#1e1060', border: '1px solid rgba(124,92,252,0.3)' }} onClick={e => e.stopPropagation()}>
            <p className="font-black text-lg text-center"
              style={{ background: 'linear-gradient(90deg,#4dd9ff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              📲 앱으로 설치하기
            </p>
            {isInAppBrowser ? (
              <>
                <p className="text-white/50 text-xs text-center">카카오톡에서는 Safari로 먼저 열어주세요</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(124,92,252,0.15)' }}>
                    <span className="text-xl shrink-0">1️⃣</span>
                    <p className="text-white/70 text-sm">우측 하단 <strong className="text-white">공유 버튼 ⬆️</strong> 탭</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(124,92,252,0.15)' }}>
                    <span className="text-xl shrink-0">2️⃣</span>
                    <p className="text-white/70 text-sm"><strong className="text-white">&quot;Safari로 열기&quot;</strong> 선택</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(124,92,252,0.15)' }}>
                    <span className="text-xl shrink-0">3️⃣</span>
                    <p className="text-white/70 text-sm">Safari에서 공유 ⬆️ → <strong className="text-white">&quot;홈 화면에 추가&quot;</strong></p>
                  </div>
                </div>
                <CopyURLButton />
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(124,92,252,0.15)' }}>
                  <span className="text-xl shrink-0">1️⃣</span>
                  <p className="text-white/70 text-sm">주소창 옆 <strong className="text-white">··· 버튼</strong> 탭</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(124,92,252,0.15)' }}>
                  <span className="text-xl shrink-0">2️⃣</span>
                  <p className="text-white/70 text-sm"><strong className="text-white">공유</strong> 선택</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(124,92,252,0.15)' }}>
                  <span className="text-xl shrink-0">3️⃣</span>
                  <p className="text-white/70 text-sm"><strong className="text-white">&quot;홈 화면에 추가&quot;</strong> 선택 후 추가!</p>
                </div>
              </div>
            )}
            <button onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #4dd9ff)' }}>확인</button>
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
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl" style={{ background: '#1e1060', border: '1px solid rgba(124,92,252,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📢</span>
              <span className="font-black text-base"
                style={{ background: 'linear-gradient(90deg,#4dd9ff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                공지사항
              </span>
            </div>
            <p className="font-bold text-white text-sm mb-2">{noticePopup.title}</p>
            {noticePopup.content && <p className="text-white/60 text-sm leading-relaxed mb-4">{noticePopup.content}</p>}
            <button onClick={() => dismissNotice(noticePopup.id)}
              className="w-full py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#7c5cfc,#4dd9ff)' }}>
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
    <div className="rounded-2xl p-3 space-y-2" style={{ background: 'rgba(124,92,252,0.15)' }}>
      <p className="text-white/40 text-xs text-center">또는 주소 복사 후 Safari에 붙여넣기</p>
      <div className="flex gap-2 items-center">
        <p className="flex-1 text-[#4dd9ff] font-mono text-xs rounded-xl px-3 py-2 truncate" style={{ background: 'rgba(0,0,0,0.3)' }}>{url}</p>
        <button onClick={copy}
          className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all text-white`}
          style={{ background: copied ? '#22c55e' : 'linear-gradient(135deg,#7c5cfc,#4dd9ff)' }}>
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

  const INPUT = "w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none text-sm"

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <p className="font-black text-xl"
          style={{ background: 'linear-gradient(90deg,#4dd9ff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          선생님 입장
        </p>
        <p className="text-white/40 text-xs mt-1">이름과 비밀번호를 입력해주세요</p>
      </div>
      <div>
        <label className="text-white/50 text-xs mb-1.5 block">이름</label>
        <input value={name} onChange={e => { setName(e.target.value); setError('') }}
          placeholder="" list="teacher-list"
          className={INPUT} style={{ background: 'rgba(124,92,252,0.2)', border: '1px solid rgba(124,92,252,0.4)' }} />
        <datalist id="teacher-list">
          {TEACHERS.map(t => <option key={t} value={t} />)}
        </datalist>
      </div>
      <div>
        <label className="text-white/50 text-xs mb-1.5 block">비밀번호</label>
        <input value={pw} onChange={e => { setPw(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && login()}
          type="password" placeholder=""
          className={INPUT + ' text-center text-xl tracking-widest'}
          style={{ background: 'rgba(124,92,252,0.2)', border: '1px solid rgba(124,92,252,0.4)' }} />
      </div>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      <button onClick={login}
        className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all"
        style={{ background: 'linear-gradient(135deg, #7c5cfc, #4dd9ff)', boxShadow: '0 4px 16px rgba(124,92,252,0.4)' }}>
        입장하기
      </button>
      <button onClick={onBack} className="w-full text-white/30 text-sm py-2">← 뒤로</button>
    </div>
  )
}

function SpecialMenu({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <p className="font-black text-xl"
          style={{ background: 'linear-gradient(90deg,#4dd9ff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          👋 {name} {getHonorific(name)}
        </p>
        <p className="text-white/40 text-xs mt-1">어디로 이동할까요?</p>
      </div>
      <button onClick={() => { window.location.href = '/forum/admin' }}
        className="w-full py-5 rounded-2xl font-bold text-white text-base transition-all"
        style={{ background: 'rgba(124,92,252,0.25)', border: '1px solid rgba(124,92,252,0.4)' }}>
        ⚔️ 선생님 관리 페이지
      </button>
      <button onClick={() => { window.location.href = '/forum/ledger' }}
        className="w-full py-5 rounded-2xl font-black text-base text-white"
        style={{ background: 'linear-gradient(135deg, #7c5cfc, #4dd9ff)', boxShadow: '0 4px 16px rgba(124,92,252,0.4)' }}>
        💰 회계선생님 전용
      </button>
      <button onClick={onBack} className="w-full text-white/30 text-sm py-2">← 뒤로</button>
    </div>
  )
}
