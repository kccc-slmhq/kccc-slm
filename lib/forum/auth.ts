const YEAR = 365 * 24 * 60 * 60

export const HONORIFICS: Record<string, string> = {
  '박예찬': '목사님',
  '김근태': '부장님',
}

function setCookie(key: string, value: string) {
  if (typeof document === 'undefined') return
  const exp = new Date(Date.now() + YEAR * 1000).toUTCString()
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${exp}; path=/`
}
function getCookie(key: string) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find(c => c.startsWith(key + '='))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}
function delCookie(key: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

export function saveAuth(teacherName: string) {
  localStorage.setItem('admin_auth', 'true')
  localStorage.setItem('teacher_name', teacherName)
  setCookie('admin_auth', 'true')
  setCookie('teacher_name', teacherName)
}

export function getAuth() {
  if (typeof window === 'undefined') return { authed: false, name: '' }
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

export function getHonorific(name: string) {
  return HONORIFICS[name] || '선생님'
}

export function getDisplayGrade(name: string, grade: string) {
  if (grade === '선생님' && HONORIFICS[name]) return HONORIFICS[name]
  return grade
}

export function clearAuth() {
  localStorage.removeItem('admin_auth')
  localStorage.removeItem('teacher_name')
  delCookie('admin_auth')
  delCookie('teacher_name')
}
