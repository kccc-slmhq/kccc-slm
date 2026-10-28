"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuth, getHonorific } from '@/lib/forum/auth'

const FULL_ACCESS = ['나미애', '박예찬']
const FEE_PER_STUDENT = 50000

const CATEGORIES = ['식비', '물품구매비', '교통비', '간식비', '데코비', '장소대여료', '준비비', '기타']

const PLANNED_TOTAL_INCOME = 5400000
const PLANNED_TOTAL_EXPENSE = 5392700

const PLANNED_BUDGET: Record<string, number> = {
  '식비':       700000,
  '물품구매비': 540000,
  '교통비':     500000,
  '간식비':     200000,
  '데코비':          0,
  '장소대여료': 700000,
  '준비비':     922700,
  '기타':      1830000,
}
const CAT_ICONS: Record<string, string>  = { '식비':'🍱','물품구매비':'🛒','교통비':'🚌','간식비':'🍪','데코비':'🎨','장소대여료':'🏠','준비비':'📝','기타':'📦' }
const CAT_COLORS: Record<string, string> = { '식비':'#60a5fa','물품구매비':'#f472b6','교통비':'#34d399','간식비':'#fbbf24','데코비':'#a78bfa','장소대여료':'#f87171','준비비':'#fb923c','기타':'#94a3b8' }

const INCOME_SOURCES = ['후원금', '부서재정', '기타수입']
const SRC_ICONS: Record<string, string>  = { '후원금':'💝','부서재정':'🏛️','기타수입':'💵' }
const SRC_COLORS: Record<string, string> = { '후원금':'#60a5fa','부서재정':'#34d399','기타수입':'#a78bfa' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export default function ForumLedger() {
  const { authed, name: teacherName } = getAuth()
  const router = useRouter()
  useEffect(() => {
    if (!authed || !teacherName) router.push('/forum')
  }, [authed, teacherName, router])
  if (!authed || !teacherName) return null
  return <LedgerContent teacherName={teacherName} />
}

function LedgerContent({ teacherName }: { teacherName: string }) {
  const isFull = FULL_ACCESS.includes(teacherName)
  const [tab, setTab] = useState(0)
  const [ledgerSub, setLedgerSub] = useState(0)
  const [ledger, setLedger]   = useState<Row[]>([])
  const [income, setIncome]   = useState<Row[]>([])
  const [budget, setBudget]   = useState<Row[]>([])
  const [students, setStudents] = useState<Row[]>([])
  const router = useRouter()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const supabase = createClient()
    const [{ data: l }, { data: b }, { data: s }, { data: inc }] = await Promise.all([
      supabase.from('ledger').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('budget').select('*'),
      supabase.from('students').select('id,name,grade,fee_paid,sibling_discount,student_type'),
      supabase.from('income').select('*').order('income_date', { ascending: false }).order('created_at', { ascending: false }),
    ])
    if (l) setLedger(l)
    if (b) setBudget(b)
    if (s) setStudents(s)
    if (inc) setIncome(inc)
  }

  function calcFee(s: Row) {
    if (['선생님','봉사자'].includes(s.grade)) return 0
    if (s.student_type === '새친구') return 0
    if (s.student_type === '헌친구') return 30000
    if (s.sibling_discount) return 40000
    return FEE_PER_STUDENT
  }

  const paidStudents   = students.filter(s => s.fee_paid)
  const feeTotal       = paidStudents.reduce((sum, s) => sum + calcFee(s), 0)
  const otherTotal     = income.reduce((sum, i) => sum + (i.amount || 0), 0)
  const totalIncome    = feeTotal + otherTotal
  const totalExpense   = ledger.reduce((sum, l) => sum + (l.amount || 0), 0)
  const totalBudget    = budget.reduce((sum, b) => sum + (b.amount || 0), 0)
  const expectedIncome = students.filter(s => !['선생님','봉사자'].includes(s.grade)).reduce((sum, s) => sum + calcFee(s), 0)

  function printDoc(html: string, title: string) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8"><title>${title}</title>
      <style>
        body { font-family: 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif; padding: 24px; color: #111; font-size: 13px; }
        h2 { margin: 0 0 4px; font-size: 18px; } p { margin: 0 0 16px; color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #d4a843; color: #000; padding: 7px 10px; text-align: left; font-size: 12px; }
        td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
        tr:nth-child(even) td { background: #fafafa; }
        .income { color: #16a34a; font-weight: bold; }
        .expense { color: #dc2626; font-weight: bold; }
        .summary { display: flex; gap: 32px; margin-bottom: 20px; }
        .summary div { text-align: center; }
        .summary .val { font-size: 20px; font-weight: 900; }
        .summary .lbl { font-size: 11px; color: #888; }
        @media print { button { display: none; } }
      </style>
    </head><body>
      <button onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#d4a843;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:13px;">🖨️ 인쇄 / PDF 저장</button>
      ${html}
    </body></html>`)
    win.document.close()
  }

  function downloadPDF() {
    const today = new Date().toLocaleDateString('ko-KR')
    const balance = totalIncome - totalExpense
    if (ledgerSub === 0) {
      const rows = ledger.map(l => `<tr><td>${l.expense_date || '-'}</td><td>${l.category}</td><td>${l.vendor || l.description || '-'}</td><td class="expense" style="text-align:right">${(l.amount||0).toLocaleString()}원</td></tr>`).join('')
      const total = `<tr><td colspan="3" style="font-weight:bold;text-align:right">합계</td><td class="expense" style="text-align:right;font-weight:900">${totalExpense.toLocaleString()}원</td></tr>`
      printDoc(`<h2>2026 VBS — 지출 장부</h2><p>출력일: ${today} · 총 ${ledger.length}건</p>
        <table><thead><tr><th>날짜</th><th>분류</th><th>업체/내용</th><th style="text-align:right">금액</th></tr></thead>
        <tbody>${rows}${total}</tbody></table>`, 'VBS2026 지출장부')
    } else if (ledgerSub === 1) {
      const feeRows = paidStudents.map(s => {
        const tag = s.student_type === '새친구' ? ' 🌱새친구' : s.student_type === '헌친구' ? ' ⛪헌친구' : s.sibling_discount ? ' 🔖형제할인' : ''
        const amt = s.student_type === '새친구' ? '면제' : s.student_type === '헌친구' ? '30,000원' : s.sibling_discount ? '40,000원' : '50,000원'
        return `<tr><td>-</td><td>회비</td><td>${s.name} (${s.grade})${tag}</td><td class="income" style="text-align:right">${amt}</td></tr>`
      }).join('')
      const otherRows = income.map(i => `<tr><td>${i.income_date || '-'}</td><td>${i.source}</td><td>${i.description || '-'}</td><td class="income" style="text-align:right">${(i.amount||0).toLocaleString()}원</td></tr>`).join('')
      const total = `<tr><td colspan="3" style="font-weight:bold;text-align:right">합계</td><td class="income" style="text-align:right;font-weight:900">${totalIncome.toLocaleString()}원</td></tr>`
      printDoc(`<h2>2026 VBS — 수입 장부</h2><p>출력일: ${today} · 회비 ${paidStudents.length}명 + 기타 ${income.length}건</p>
        <table><thead><tr><th>날짜</th><th>종류</th><th>내용</th><th style="text-align:right">금액</th></tr></thead>
        <tbody>${feeRows}${otherRows}${total}</tbody></table>`, 'VBS2026 수입장부')
    } else {
      const feeRows = paidStudents.map(s => `<tr><td>-</td><td class="income">수입</td><td>회비</td><td>${s.name} (${s.grade})${s.sibling_discount ? ' 🔖형제할인' : ''}</td><td class="income" style="text-align:right">+${s.sibling_discount ? '40,000원' : '50,000원'}</td></tr>`).join('')
      const incRows = income.map(i => `<tr><td>${i.income_date||'-'}</td><td class="income">수입</td><td>${i.source}</td><td>${i.description||'-'}</td><td class="income" style="text-align:right">+${(i.amount||0).toLocaleString()}원</td></tr>`).join('')
      const expRows = ledger.map(l => `<tr><td>${l.expense_date||'-'}</td><td class="expense">지출</td><td>${l.category}</td><td>${l.vendor||l.description||'-'}</td><td class="expense" style="text-align:right">-${(l.amount||0).toLocaleString()}원</td></tr>`).join('')
      printDoc(`<h2>2026 VBS — 전체 장부</h2><p>출력일: ${today}</p>
        <div class="summary">
          <div><div class="val income">${totalIncome.toLocaleString()}원</div><div class="lbl">총 수입</div></div>
          <div><div class="val expense">${totalExpense.toLocaleString()}원</div><div class="lbl">총 지출</div></div>
          <div><div class="val" style="color:${balance>=0?'#d4a843':'#dc2626'}">${balance.toLocaleString()}원</div><div class="lbl">잔액</div></div>
          <div><div class="val">${(totalBudget||0).toLocaleString()}원</div><div class="lbl">총 예산</div></div>
        </div>
        <table><thead><tr><th>날짜</th><th>구분</th><th>분류</th><th>내용</th><th style="text-align:right">금액</th></tr></thead>
        <tbody>${feeRows}${incRows}${expRows}</tbody></table>`, 'VBS2026 전체장부')
    }
  }

  const MAIN_TABS   = ['📸 영수증', '📋 장부', '📈 재정']
  const SIMPLE_TABS = ['📈 재정 현황']
  const tabs = isFull ? MAIN_TABS : SIMPLE_TABS

  const shared = { ledger, income, budget, students, paidStudents, feeTotal, otherTotal, totalIncome, totalExpense, totalBudget, expectedIncome, onRefresh: fetchAll, isFull }

  return (
    <div className="min-h-screen bg-[#e8f4ff] flex flex-col">
      <div className="bg-[#d0eaff] border-b border-[#0284c7]/20 px-4 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[#0369a1] font-black text-lg">💰 회계 장부</h1>
          <p className="text-black/40 text-xs">{teacherName} {getHonorific(teacherName)} · 2026 여름성경학교</p>
        </div>
        <div className="flex gap-2">
          {isFull && tab === 1 && <button onClick={downloadPDF} className="btn-gold px-3 py-2 rounded-xl text-xs font-bold">📄 PDF</button>}
          <button onClick={() => router.push(isFull ? '/forum' : '/forum/admin')} className="text-black/30 text-xs px-2">나가기</button>
        </div>
      </div>

      <div className="flex border-b border-black/10 shrink-0">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-1 py-3 text-sm font-bold transition-all ${tab === i ? 'text-[#0369a1] border-b-2 border-[#d4a843]' : 'text-black/40'}`}>
            {t}
          </button>
        ))}
      </div>

      {isFull && tab === 1 && (
        <div className="flex border-b border-black/5 shrink-0">
          {['지출', '수입', '전체'].map((t, i) => (
            <button key={i} onClick={() => setLedgerSub(i)}
              className={`flex-1 py-2.5 text-xs font-bold transition-all ${ledgerSub === i ? 'text-[#0369a1]' : 'text-black/30'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isFull ? (
          <>
            {tab === 0 && <ReceiptTab onSaved={fetchAll} recentLedger={ledger.slice(0, 5)} />}
            {tab === 1 && ledgerSub === 0 && <ExpenseTab ledger={ledger} onRefresh={fetchAll} />}
            {tab === 1 && ledgerSub === 1 && <IncomeTab {...shared} />}
            {tab === 1 && ledgerSub === 2 && <AllTab {...shared} />}
            {tab === 2 && <FinanceTab {...shared} />}
          </>
        ) : (
          <FinanceTab {...shared} />
        )}
      </div>
    </div>
  )
}

function ReceiptTab({ onSaved, recentLedger = [] }: { onSaved: () => void; recentLedger?: Row[] }) {
  const [image, setImage]       = useState<{base64: string; mimeType: string; preview: string} | null>(null)
  const [scanning, setScanning] = useState(false)
  const [ocr, setOcr]           = useState<Row | null>(null)
  const [category, setCategory] = useState('식비')
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual]     = useState({ amount: '', vendor: '', expense_date: new Date().toISOString().split('T')[0], description: '' })
  const [ocrEdit, setOcrEdit]   = useState<Row | null>(null)
  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      setImage({ base64: dataUrl.split(',')[1], mimeType: file.type || 'image/jpeg', preview: dataUrl })
      setOcr(null); setDone(false)
      doOCR(dataUrl.split(',')[1], file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  async function doOCR(base64: string, mimeType: string) {
    setScanning(true)
    try {
      const res = await fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, mimeType }) })
      const data = await res.json()
      setOcr(data)
      setOcrEdit({ amount: data.amount || '', vendor: data.vendor || '', date: data.date || new Date().toISOString().split('T')[0], description: data.description || '' })
    } catch {
      setOcr({ amount: 0, vendor: '', date: '', description: '' })
      setOcrEdit({ amount: '', vendor: '', date: new Date().toISOString().split('T')[0], description: '' })
    }
    setScanning(false)
  }

  async function save() {
    if (!ocrEdit || saving) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('ledger').insert({
      category,
      amount: parseInt(String(ocrEdit.amount).replace(/[^0-9]/g, '')) || 0,
      vendor: ocrEdit.vendor || '',
      description: ocrEdit.description || '',
      expense_date: ocrEdit.date || new Date().toISOString().split('T')[0],
    })
    setSaving(false); setDone(true); onSaved()
    setTimeout(() => { setImage(null); setOcr(null); setDone(false); setCategory('식비') }, 1800)
  }

  async function saveManual() {
    if (!manual.amount || saving) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('ledger').insert({
      category,
      amount: parseInt(String(manual.amount).replace(/[^0-9]/g, '')) || 0,
      vendor: manual.vendor,
      description: manual.description,
      expense_date: manual.expense_date || new Date().toISOString().split('T')[0],
    })
    setSaving(false); setDone(true); onSaved()
    setTimeout(() => { setManualMode(false); setDone(false); setCategory('식비'); setManual({ amount: '', vendor: '', expense_date: new Date().toISOString().split('T')[0], description: '' }) }, 1800)
  }

  function reset() { setImage(null); setOcr(null); setDone(false); setCategory('식비') }

  return (
    <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
      {!image && !manualMode && (
        <div className="space-y-3">
          <p className="text-black/50 text-center text-sm">영수증을 찍어 올려주세요</p>
          <button onClick={() => cameraRef.current?.click()}
            className="w-full rounded-3xl flex flex-col items-center justify-center gap-3 py-14 transition-all active:scale-95"
            style={{ background: 'rgba(212,168,67,0.08)', border: '2px dashed rgba(212,168,67,0.4)' }}>
            <span className="text-6xl">📷</span>
            <span className="text-[#0369a1] font-black text-xl">영수증 촬영</span>
            <span className="text-black/30 text-xs">카메라로 직접 찍기</span>
          </button>
          <button onClick={() => galleryRef.current?.click()}
            className="w-full rounded-2xl flex items-center justify-center gap-3 py-5 transition-all active:scale-95"
            style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <span className="text-2xl">🖼️</span>
            <span className="text-black/70 font-bold">사진 앨범에서 선택</span>
          </button>
          <button onClick={() => setManualMode(true)}
            className="w-full rounded-2xl flex items-center justify-center gap-3 py-5 transition-all active:scale-95"
            style={{ background: 'rgba(3,105,161,0.06)', border: '1px solid rgba(3,105,161,0.15)' }}>
            <span className="text-2xl">✏️</span>
            <span className="text-[#0369a1] font-bold">영수증 없이 직접 입력</span>
          </button>
          <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {manualMode && !done && (
        <div className="space-y-4">
          <p className="text-black/50 text-center text-sm">지출 내용을 직접 입력해주세요</p>
          <div className="card-dark rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-black/40 text-xs mb-1">날짜</p>
                <input type="date" value={manual.expense_date}
                  onChange={e => setManual(p => ({...p, expense_date: e.target.value}))}
                  className="w-full bg-black/5 rounded-xl px-3 py-2.5 text-[#0c1a26] text-sm outline-none border border-black/10 focus:border-[#d4a843]/50" />
              </div>
              <div>
                <p className="text-black/40 text-xs mb-1">금액 (원)</p>
                <input type="number" value={manual.amount} placeholder="0"
                  onChange={e => setManual(p => ({...p, amount: e.target.value}))}
                  className="w-full bg-black/5 rounded-xl px-3 py-2.5 text-[#0c1a26] text-sm outline-none border border-black/10 focus:border-[#d4a843]/50" />
              </div>
            </div>
            <div>
              <p className="text-black/40 text-xs mb-1">상호명</p>
              <input value={manual.vendor} placeholder="예: 이마트, 홈플러스..."
                onChange={e => setManual(p => ({...p, vendor: e.target.value}))}
                className="w-full bg-black/5 rounded-xl px-3 py-2.5 text-[#0c1a26] text-sm outline-none border border-black/10 focus:border-[#d4a843]/50" />
            </div>
            <div>
              <p className="text-black/40 text-xs mb-1">분류</p>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${category === cat ? 'btn-gold' : 'bg-black/5 text-black/50 border border-black/10'}`}>
                    <span className="text-lg">{CAT_ICONS[cat]}</span>
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={saveManual} disabled={saving || !manual.amount}
              className="w-full btn-gold py-4 rounded-2xl font-black text-lg disabled:opacity-40">
              {saving ? '저장 중...' : '✅ 장부에 기록하기'}
            </button>
            <button onClick={() => setManualMode(false)} className="w-full text-black/30 text-sm py-1">← 뒤로</button>
          </div>
        </div>
      )}

      {image && (
        <>
          <div className="relative rounded-2xl overflow-hidden border border-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt="영수증" className="w-full object-contain max-h-60" />
            {!done && <button onClick={reset} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white text-lg">×</button>}
          </div>
          {scanning && (
            <div className="card-dark rounded-2xl p-6 text-center">
              <div className="text-3xl mb-2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
              <p className="text-[#0369a1] font-bold">AI가 영수증 읽는 중...</p>
              <p className="text-black/30 text-xs mt-1">금액 · 업체명 · 날짜 자동 인식</p>
            </div>
          )}
          {ocr && ocrEdit && !scanning && !done && (
            <div className="card-dark rounded-2xl p-4 space-y-4">
              <div className="space-y-2.5">
                <p className="text-black/40 text-xs font-bold">📖 AI 인식 결과 · 직접 수정 가능</p>
                <div><p className="text-black/40 text-xs mb-1">날짜</p>
                  <input type="date" value={ocrEdit.date} onChange={e => setOcrEdit((p: Row) => ({...p, date: e.target.value}))}
                    className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-[#0c1a26] text-sm outline-none" /></div>
                <div><p className="text-black/40 text-xs mb-1">금액 (원)</p>
                  <input type="number" value={ocrEdit.amount} placeholder="0" onChange={e => setOcrEdit((p: Row) => ({...p, amount: e.target.value}))}
                    className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-[#0369a1] font-black text-sm outline-none" /></div>
                <div><p className="text-black/40 text-xs mb-1">업체명</p>
                  <input value={ocrEdit.vendor} placeholder="업체명 입력" onChange={e => setOcrEdit((p: Row) => ({...p, vendor: e.target.value}))}
                    className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-[#0c1a26] text-sm outline-none" /></div>
                <div><p className="text-black/40 text-xs mb-1">세부사항</p>
                  <input value={ocrEdit.description || ''} placeholder="예: 간사 식대, 준비물 구매 등" onChange={e => setOcrEdit((p: Row) => ({...p, description: e.target.value}))}
                    className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-[#0c1a26] text-sm outline-none" /></div>
              </div>
              <div>
                <p className="text-black/60 text-sm font-bold mb-2">이 지출의 종류를 선택해주세요</p>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)}
                      className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${category === cat ? 'btn-gold' : 'bg-black/5 text-black/50 border border-black/10'}`}>
                      <span className="text-lg">{CAT_ICONS[cat]}</span><span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={save} disabled={saving} className="w-full btn-gold py-5 rounded-2xl font-black text-lg disabled:opacity-40">
                {saving ? '저장 중...' : '✅ 장부에 기록하기'}
              </button>
            </div>
          )}
          {done && (
            <div className="card-dark rounded-2xl p-8 text-center">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-green-400 font-black text-xl">기록 완료!</p>
              <p className="text-black/40 text-sm mt-2">장부에 저장됐습니다</p>
            </div>
          )}
        </>
      )}

      {recentLedger.length > 0 && (
        <div className="space-y-2">
          <p className="text-black/40 text-xs font-bold tracking-widest text-center">최근 등록 내역</p>
          <div className="card-dark rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left text-black/30 px-3 py-2 font-medium">날짜</th>
                  <th className="text-left text-black/30 px-3 py-2 font-medium">분류</th>
                  <th className="text-left text-black/30 px-3 py-2 font-medium">업체</th>
                  <th className="text-right text-black/30 px-3 py-2 font-medium">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {recentLedger.map(l => (
                  <tr key={l.id}>
                    <td className="px-3 py-2.5 text-black/40">{l.expense_date?.slice(5) || '-'}</td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: CAT_COLORS[l.category] || '#d4a843' }}>{CAT_ICONS[l.category]} {l.category}</td>
                    <td className="px-3 py-2.5 max-w-20"><p className="text-black/60 truncate">{l.vendor || '-'}</p></td>
                    <td className="px-3 py-2.5 text-[#0c1a26] font-bold text-right">{(l.amount||0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ExpenseTab({ ledger, onRefresh }: { ledger: Row[]; onRefresh: () => void }) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Row>({})

  function startEdit(l: Row) {
    setEditId(l.id)
    setEditData({ amount: l.amount || 0, category: l.category, vendor: l.vendor || '', description: l.description || '', expense_date: l.expense_date || '' })
  }

  async function saveEdit() {
    const supabase = createClient()
    await supabase.from('ledger').update({
      amount: parseInt(String(editData.amount).replace(/[^0-9]/g, '')) || 0,
      category: editData.category, vendor: editData.vendor,
      description: editData.description, expense_date: editData.expense_date,
    }).eq('id', editId)
    setEditId(null); onRefresh()
  }

  async function deleteRow(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('ledger').delete().eq('id', id); onRefresh()
  }

  const totalSpent = ledger.reduce((s, l) => s + (l.amount || 0), 0)

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-black/60 text-sm">총 {ledger.length}건</p>
        <p className="text-red-400 font-bold">{totalSpent.toLocaleString()}원</p>
      </div>
      {ledger.length === 0 ? (
        <div className="text-center py-16 text-black/30"><p className="text-3xl mb-2">📋</p><p>아직 지출 내역이 없어요</p></div>
      ) : (
        <div className="space-y-2">
          {ledger.map(l => editId === l.id ? (
            <div key={l.id} className="card-dark rounded-2xl p-4 space-y-3 border border-[#0284c7]/25">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-black/40 text-xs mb-1">날짜</p>
                  <input type="date" value={editData.expense_date} onChange={e => setEditData(p => ({...p, expense_date: e.target.value}))}
                    className="w-full bg-black/5 rounded-xl px-3 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
                <div><p className="text-black/40 text-xs mb-1">금액</p>
                  <input type="number" value={editData.amount} onChange={e => setEditData(p => ({...p, amount: e.target.value}))}
                    className="w-full bg-black/5 rounded-xl px-3 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
              </div>
              <div><p className="text-black/40 text-xs mb-1">업체명</p>
                <input value={editData.vendor} onChange={e => setEditData(p => ({...p, vendor: e.target.value}))}
                  className="w-full bg-black/5 rounded-xl px-3 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
              <div><p className="text-black/40 text-xs mb-1">세부사항</p>
                <input value={editData.description} onChange={e => setEditData(p => ({...p, description: e.target.value}))}
                  placeholder="예: 간사 식대, 준비물 구매 등"
                  className="w-full bg-black/5 rounded-xl px-3 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
              <div><p className="text-black/40 text-xs mb-1">분류</p>
                <div className="grid grid-cols-4 gap-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setEditData(p => ({...p, category: cat}))}
                      className={`py-2 rounded-lg text-xs font-bold ${editData.category === cat ? 'btn-gold' : 'bg-black/5 text-black/50'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex-1 btn-gold py-2.5 rounded-xl font-bold text-sm">저장</button>
                <button onClick={() => setEditId(null)} className="flex-1 bg-black/5 text-black/50 py-2.5 rounded-xl text-sm">취소</button>
              </div>
            </div>
          ) : (
            <div key={l.id} className="card-dark rounded-2xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-bold" style={{ color: CAT_COLORS[l.category] || '#d4a843' }}>{CAT_ICONS[l.category]} {l.category}</span>
                  <span className="text-black/30 text-xs">{l.expense_date?.slice(5) || '-'}</span>
                </div>
                <p className="text-black/70 text-sm truncate">{l.vendor || l.description || '-'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[#0c1a26] font-bold text-sm">{(l.amount||0).toLocaleString()}원</span>
                <button onClick={() => startEdit(l)} className="text-[#0369a1]/70 text-xs px-2 py-1 rounded-lg bg-[#0284c7]/10">수정</button>
                <button onClick={() => deleteRow(l.id)} className="text-red-400/70 text-xs px-2 py-1 rounded-lg bg-red-400/10">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {ledger.length > 0 && (
        <div className="flex justify-between items-center card-dark rounded-2xl px-4 py-3">
          <span className="text-black/60 text-sm font-bold">합계</span>
          <span className="text-red-400 font-black">{totalSpent.toLocaleString()}원</span>
        </div>
      )}
    </div>
  )
}

function IncomeTab({ income, paidStudents, feeTotal, otherTotal, totalIncome, onRefresh }: Row) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ amount: '', source: '후원금', description: '', income_date: new Date().toISOString().split('T')[0] })
  const [editId, setEditId]   = useState<string | null>(null)
  const [editData, setEditData] = useState<Row>({})
  const [saving, setSaving]   = useState(false)

  async function addIncome() {
    if (!form.amount) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('income').insert({ amount: parseInt(String(form.amount).replace(/[^0-9]/g, '')) || 0, source: form.source, description: form.description, income_date: form.income_date })
    setShowAdd(false); setForm({ amount: '', source: '후원금', description: '', income_date: new Date().toISOString().split('T')[0] }); setSaving(false); onRefresh()
  }

  async function saveEdit() {
    const supabase = createClient()
    await supabase.from('income').update({ amount: parseInt(String(editData.amount).replace(/[^0-9]/g, '')) || 0, source: editData.source, description: editData.description, income_date: editData.income_date }).eq('id', editId)
    setEditId(null); onRefresh()
  }

  async function deleteIncome(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('income').delete().eq('id', id); onRefresh()
  }

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      <div className="card-dark rounded-2xl p-4 grid grid-cols-3 gap-1 text-center">
        <div><p className="text-black/40 text-xs">회비 수입</p><p className="text-green-400 font-black text-sm mt-0.5">{feeTotal.toLocaleString()}원</p><p className="text-black/25 text-xs">{paidStudents.length}명 납부</p></div>
        <div className="border-x border-black/10"><p className="text-black/40 text-xs">기타 수입</p><p className="text-[#0369a1] font-black text-sm mt-0.5">{otherTotal.toLocaleString()}원</p><p className="text-black/25 text-xs">{income.length}건</p></div>
        <div><p className="text-black/40 text-xs">총 수입</p><p className="text-green-600 font-black text-sm mt-0.5">{totalIncome.toLocaleString()}원</p></div>
      </div>
      <div>
        <p className="text-black/40 text-xs font-bold tracking-widest mb-2">회비 수입 (자동 집계)</p>
        <div className="card-dark rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex justify-between items-center border-b border-black/5">
            <span className="text-black/60 text-sm">납부 완료 {paidStudents.length}명</span>
            <span className="text-green-400 font-bold">{feeTotal.toLocaleString()}원</span>
          </div>
          {paidStudents.length > 0 && (
            <div className="px-4 py-2 max-h-40 overflow-auto">
              {paidStudents.map((s: Row) => (
                <div key={s.id} className="flex justify-between py-1.5 border-b border-black/5 last:border-0">
                  <span className="text-black/60 text-xs">{s.name} ({s.grade})</span>
                  <span className="text-black/40 text-xs">{s.student_type === '새친구' ? '새친구 면제' : s.student_type === '헌친구' ? '30,000원 (헌친구)' : s.sibling_discount ? '40,000원 (형제할인)' : '50,000원'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-black/40 text-xs font-bold tracking-widest">기타 수입</p>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-gold px-3 py-1.5 rounded-xl text-xs font-bold">{showAdd ? '취소' : '+ 추가'}</button>
        </div>
        {showAdd && (
          <div className="card-dark rounded-2xl p-4 space-y-3 mb-3 border border-[#0284c7]/25">
            <div className="flex gap-2">
              <div style={{flex:1, minWidth:0}}><p className="text-black/40 text-xs mb-1">날짜</p>
                <input type="date" value={form.income_date} onChange={e => setForm(p => ({...p, income_date: e.target.value}))}
                  className="w-full bg-black/5 rounded-xl px-2 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
              <div style={{flex:1, minWidth:0}}><p className="text-black/40 text-xs mb-1">금액 (원)</p>
                <input type="number" value={form.amount} placeholder="0" onChange={e => setForm(p => ({...p, amount: e.target.value}))}
                  className="w-full bg-black/5 rounded-xl px-2 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
            </div>
            <div><p className="text-black/40 text-xs mb-1">종류</p>
              <div className="flex gap-2">
                {INCOME_SOURCES.map(src => (
                  <button key={src} onClick={() => setForm(p => ({...p, source: src}))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${form.source === src ? 'btn-gold' : 'bg-black/5 text-black/50'}`}>{src}</button>
                ))}
              </div>
            </div>
            <div><p className="text-black/40 text-xs mb-1">내용 (선택)</p>
              <input value={form.description} placeholder="예: OOO 집사님 후원금" onChange={e => setForm(p => ({...p, description: e.target.value}))}
                className="w-full bg-black/5 rounded-xl px-3 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
            <button onClick={addIncome} disabled={saving || !form.amount} className="w-full btn-gold py-3 rounded-xl font-bold text-sm disabled:opacity-40">
              {saving ? '저장 중...' : '✅ 수입 기록하기'}
            </button>
          </div>
        )}
        {income.length === 0 ? (
          <div className="text-center py-8 card-dark rounded-2xl text-black/20"><p className="text-2xl mb-1">💵</p><p className="text-sm">기타 수입이 없어요</p></div>
        ) : (
          <div className="space-y-2">
            {income.map((i: Row) => editId === i.id ? (
              <div key={i.id} className="card-dark rounded-2xl p-4 space-y-3 border border-[#0284c7]/25">
                <div className="flex gap-2">
                  <div style={{flex:1, minWidth:0}}><p className="text-black/40 text-xs mb-1">날짜</p>
                    <input type="date" value={editData.income_date} onChange={e => setEditData(p => ({...p, income_date: e.target.value}))}
                      className="w-full bg-black/5 rounded-xl px-2 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
                  <div style={{flex:1, minWidth:0}}><p className="text-black/40 text-xs mb-1">금액</p>
                    <input type="number" value={editData.amount} onChange={e => setEditData(p => ({...p, amount: e.target.value}))}
                      className="w-full bg-black/5 rounded-xl px-2 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
                </div>
                <div><p className="text-black/40 text-xs mb-1">종류</p>
                  <div className="flex gap-2">
                    {INCOME_SOURCES.map(src => (
                      <button key={src} onClick={() => setEditData(p => ({...p, source: src}))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold ${editData.source === src ? 'btn-gold' : 'bg-black/5 text-black/50'}`}>{src}</button>
                    ))}
                  </div>
                </div>
                <div><p className="text-black/40 text-xs mb-1">내용</p>
                  <input value={editData.description} onChange={e => setEditData(p => ({...p, description: e.target.value}))}
                    className="w-full bg-black/5 rounded-xl px-3 py-2 text-[#0c1a26] text-xs outline-none border border-black/10" /></div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex-1 btn-gold py-2.5 rounded-xl font-bold text-sm">저장</button>
                  <button onClick={() => setEditId(null)} className="flex-1 bg-black/5 text-black/50 py-2.5 rounded-xl text-sm">취소</button>
                </div>
              </div>
            ) : (
              <div key={i.id} className="card-dark rounded-2xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold" style={{ color: SRC_COLORS[i.source] || '#34d399' }}>{SRC_ICONS[i.source]} {i.source}</span>
                    <span className="text-black/30 text-xs">{i.income_date?.slice(5) || '-'}</span>
                  </div>
                  <p className="text-black/70 text-sm truncate">{i.description || '-'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-green-400 font-bold text-sm">{(i.amount||0).toLocaleString()}원</span>
                  <button onClick={() => { setEditId(i.id); setEditData({ amount: i.amount, source: i.source, description: i.description || '', income_date: i.income_date }) }}
                    className="text-[#0369a1]/70 text-xs px-2 py-1 rounded-lg bg-[#0284c7]/10">수정</button>
                  <button onClick={() => deleteIncome(i.id)} className="text-red-400/70 text-xs px-2 py-1 rounded-lg bg-red-400/10">삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AllTab({ ledger, income, paidStudents, feeTotal, totalIncome, totalExpense }: Row) {
  const balance = totalIncome - totalExpense
  const allItems = [
    ...paidStudents.map((s: Row) => ({ id: `fee_${s.id}`, type: 'income', date: null, label: `회비 - ${s.name}`, amount: (s.sibling_discount ? 40000 : FEE_PER_STUDENT), tag: '회비', color: '#34d399' })),
    ...income.map((i: Row) => ({ id: i.id, type: 'income', date: i.income_date, label: i.description || i.source, amount: i.amount || 0, tag: i.source, color: SRC_COLORS[i.source] || '#34d399' })),
    ...ledger.map((l: Row) => ({ id: l.id, type: 'expense', date: l.expense_date, label: l.vendor || l.description || '-', amount: l.amount || 0, tag: l.category, color: CAT_COLORS[l.category] || '#d4a843' })),
  ].sort((a, b) => {
    if (!a.date && !b.date) return 0; if (!a.date) return 1; if (!b.date) return -1
    return (b.date as string).localeCompare(a.date as string)
  })

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-4">
      <div className="card-dark rounded-2xl p-4 grid grid-cols-3 gap-1 text-center">
        <div><p className="text-black/40 text-xs">총 수입</p><p className="text-green-400 font-black text-sm mt-0.5">{totalIncome.toLocaleString()}원</p></div>
        <div className="border-x border-black/10"><p className="text-black/40 text-xs">총 지출</p><p className="text-red-400 font-black text-sm mt-0.5">{totalExpense.toLocaleString()}원</p></div>
        <div><p className="text-black/40 text-xs">잔액</p><p className={`font-black text-sm mt-0.5 ${balance >= 0 ? 'text-[#0369a1]' : 'text-red-400'}`}>{Math.abs(balance).toLocaleString()}원</p></div>
      </div>
      <div className="space-y-2">
        {allItems.map(item => (
          <div key={item.id} className="card-dark rounded-2xl p-3 flex items-center gap-3">
            <div className={`w-1.5 h-10 rounded-full shrink-0 ${item.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold" style={{ color: item.color }}>{item.tag}</span>
                {item.date && <span className="text-black/30 text-xs">{(item.date as string).slice(5)}</span>}
              </div>
              <p className="text-black/70 text-sm truncate">{item.label}</p>
            </div>
            <span className={`font-bold text-sm shrink-0 ${item.type === 'income' ? 'text-green-400' : 'text-[#1a1008]'}`}>
              {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString()}원
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FinanceTab({ ledger, budget, students, paidStudents, feeTotal, otherTotal, totalIncome, totalExpense, totalBudget, expectedIncome, onRefresh, isFull }: Row) {
  const balance = totalIncome - totalExpense
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetTab, setBudgetTab] = useState(0)

  const INCOME_ROWS = [
    { label: '행사비 (절기행사)', sub: '여름성경학교', amount: 2000000 },
    { label: '어린이 회비', sub: '40명×50,000원', amount: 2000000 },
    { label: '영화 관람비', sub: '', amount: 400000 },
    { label: '유초등부 예비비', sub: '', amount: 500000 },
    { label: '후원', sub: '', amount: 500000 },
  ]
  const EXPENSE_ROWS = [
    { label: '진행물품비', sub: '프로그램 준비물', amount: 300000 },
    { label: '공과비 (어린이)', sub: '40권 × 9,900원', amount: 396000 },
    { label: '공과비 (교사)', sub: '13권 × 12,900원', amount: 167700 },
    { label: '성경학교 디렉터 팩', sub: '전체 자료비', amount: 59000 },
    { label: '물놀이', sub: '운영비', amount: 1000000 },
    { label: '회관 장소 사용', sub: '운영비', amount: 700000 },
    { label: '식사비', sub: '54명', amount: 700000 },
    { label: '간식비', sub: '54명', amount: 200000 },
    { label: '의료비', sub: '비상약품', amount: 30000 },
    { label: '영화관람비', sub: '롯데시네마', amount: 400000 },
    { label: '티셔츠', sub: '54명', amount: 540000 },
    { label: '교통비', sub: '렌트 및 주유', amount: 500000 },
    { label: '여행자보험', sub: '54명', amount: 400000 },
  ]

  function downloadBudgetPDF() {
    const win = window.open('', '_blank')
    if (!win) return
    const incRows = INCOME_ROWS.map(r => `<tr><td>${r.label}${r.sub ? ` <span style="color:#999;font-size:11px">(${r.sub})</span>` : ''}</td><td class="amt green">${r.amount.toLocaleString()}원</td></tr>`).join('')
    const expRows = EXPENSE_ROWS.map(r => `<tr><td>${r.label}${r.sub ? ` <span style="color:#999;font-size:11px">(${r.sub})</span>` : ''}</td><td class="amt red">${r.amount.toLocaleString()}원</td></tr>`).join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>2026 성경학교 예산안</title>
    <style>body{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;padding:32px;color:#111;font-size:13px;max-width:600px;margin:0 auto}h2{font-size:20px;margin:0 0 4px;color:#0369a1}p{margin:0 0 24px;color:#888;font-size:12px}h3{font-size:14px;margin:24px 0 8px;color:#333}table{width:100%;border-collapse:collapse;margin-bottom:8px}th{background:#f0f4f8;padding:8px 12px;text-align:left;font-size:12px;color:#555}td{padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}.amt{text-align:right;font-weight:700}.green{color:#16a34a}.red{color:#dc2626}.total td{font-weight:900;font-size:14px;border-top:2px solid #ddd;background:#fafafa}button{margin-bottom:20px;padding:8px 20px;background:#0369a1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px}@media print{button{display:none}}</style></head><body>
    <button onclick="window.print()">🖨️ 인쇄 / PDF 저장</button>
    <h2>📋 2026 여름성경학교 예산안</h2><p>별내오륜교회 유초등부 · 다윗 어드벤처</p>
    <h3>수입부</h3><table><thead><tr><th>항목</th><th style="text-align:right">예산</th></tr></thead><tbody>${incRows}<tr class="total"><td>합계</td><td class="amt green">${PLANNED_TOTAL_INCOME.toLocaleString()}원</td></tr></tbody></table>
    <h3>지출부</h3><table><thead><tr><th>항목</th><th style="text-align:right">예산</th></tr></thead><tbody>${expRows}<tr class="total"><td>합계</td><td class="amt red">${PLANNED_TOTAL_EXPENSE.toLocaleString()}원</td></tr></tbody></table>
    </body></html>`)
    win.document.close()
  }

  function DonutChart({ value, max, color, label, sub }: { value: number; max: number; color: string; label: string; sub: string }) {
    const size = 130, stroke = 24, r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    const pct = max > 0 ? Math.min(value / max, 1) : 0
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
              strokeWidth={stroke} strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[#0c1a26] font-black text-xl">{Math.round(pct * 100)}%</p>
            <p className="text-black/30 text-xs">{(value/10000).toFixed(0)}만원</p>
          </div>
        </div>
        <div className="text-center">
          <p className="font-bold text-xs" style={{ color }}>{label}</p>
          <p className="text-black/30 text-xs">{sub}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      <div className="card-dark rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
        <div><p className="text-black/40 text-xs">총 수입</p><p className="text-green-400 font-black text-lg mt-0.5">{(totalIncome/10000).toFixed(1)}만</p></div>
        <div className="border-x border-black/10"><p className="text-black/40 text-xs">총 지출</p><p className="text-red-400 font-black text-lg mt-0.5">{(totalExpense/10000).toFixed(1)}만</p></div>
        <div><p className="text-black/40 text-xs">잔액</p><p className={`font-black text-lg mt-0.5 ${balance >= 0 ? 'text-[#0369a1]' : 'text-red-400'}`}>{(Math.abs(balance)/10000).toFixed(1)}만</p></div>
      </div>
      <div className="card-dark rounded-2xl p-4">
        <p className="text-[#0369a1] font-bold text-sm text-center mb-4">재정 현황</p>
        <div className="grid grid-cols-2 gap-4">
          <DonutChart value={totalIncome} max={PLANNED_TOTAL_INCOME} color="#34d399" label="수입" sub={`목표 ${(PLANNED_TOTAL_INCOME/10000).toFixed(0)}만원`} />
          <DonutChart value={totalExpense} max={PLANNED_TOTAL_EXPENSE} color="#ef4444" label="지출" sub={`예산 ${(PLANNED_TOTAL_EXPENSE/10000).toFixed(0)}만원`} />
        </div>
      </div>
      <div className="card-dark rounded-2xl p-4 space-y-3">
        <p className="text-[#0369a1] font-bold text-sm">수입 구성</p>
        {[
          { label: '회비 수입', amount: feeTotal, color: '#34d399' },
          { label: '기타 수입', amount: otherTotal, color: '#60a5fa' },
        ].map(item => {
          const pct = totalIncome > 0 ? (item.amount / totalIncome) * 100 : 0
          return (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-black/70">{item.label}</span>
                <span className="text-black/40">{item.amount.toLocaleString()}원 ({Math.round(pct)}%)</span>
              </div>
              <div className="h-2.5 bg-black/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
              </div>
            </div>
          )
        })}
      </div>
      {isFull && (
        <button onClick={() => setShowBudgetModal(true)} className="w-full text-sm py-3 rounded-2xl font-bold"
          style={{ background: 'rgba(212,168,67,0.15)', color: '#d4a843', border: '1.5px dashed rgba(212,168,67,0.4)' }}>
          📋 기획안 예산안 보기
        </button>
      )}
      <div className="card-dark rounded-2xl p-4 space-y-3">
        <p className="text-[#0369a1] font-bold text-sm">카테고리별 지출</p>
        {CATEGORIES.map(cat => {
          const spent = ledger.filter((l: Row) => l.category === cat).reduce((s: number, l: Row) => s + (l.amount || 0), 0)
          const bgt = PLANNED_BUDGET[cat] || 0
          if (spent === 0 && bgt === 0) return null
          const pct = bgt > 0 ? Math.min((spent / bgt) * 100, 100) : 0
          const over = bgt > 0 && spent > bgt
          return (
            <div key={cat}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-black/70">{CAT_ICONS[cat]} {cat}</span>
                <span className={over ? 'text-red-400 font-bold' : 'text-black/40'}>
                  {(spent/10000).toFixed(1)}만 / {(bgt/10000).toFixed(1)}만 {over && '⚠️'}
                </span>
              </div>
              <div className="h-2.5 bg-black/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? '#ef4444' : CAT_COLORS[cat] }} />
              </div>
            </div>
          )
        })}
      </div>
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowBudgetModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h2 className="text-[#0369a1] font-black text-base">📋 2026 성경학교 예산안</h2>
              <div className="flex items-center gap-2">
                <button onClick={downloadBudgetPDF} className="text-xs px-3 py-1.5 rounded-xl font-bold btn-gold">📄 PDF</button>
                <button onClick={() => setShowBudgetModal(false)} className="text-black/30 text-2xl font-bold leading-none">×</button>
              </div>
            </div>
            <div className="flex border-b border-black/10 shrink-0 px-5">
              {['💚 수입부', '🔴 지출부'].map((t, i) => (
                <button key={i} onClick={() => setBudgetTab(i)}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${budgetTab === i ? 'text-[#0369a1] border-b-2 border-[#d4a843]' : 'text-black/40'}`}>{t}</button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {budgetTab === 0 ? (
                <div className="rounded-2xl overflow-hidden border border-black/8">
                  {INCOME_ROWS.map((row, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3 text-sm border-b border-black/5 last:border-0">
                      <div><span className="text-black/70">{row.label}</span>{row.sub && <span className="text-black/30 text-xs ml-1">({row.sub})</span>}</div>
                      <span className="text-green-600 font-bold shrink-0 ml-2">{row.amount.toLocaleString()}원</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3" style={{ background: '#f0fdf4' }}>
                    <span className="font-black text-sm text-black/70">합계</span>
                    <span className="font-black text-sm text-green-600">{PLANNED_TOTAL_INCOME.toLocaleString()}원</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-black/8">
                  {EXPENSE_ROWS.map((row, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3 text-sm border-b border-black/5 last:border-0">
                      <div><span className="text-black/70">{row.label}</span>{row.sub && <span className="text-black/30 text-xs ml-1">({row.sub})</span>}</div>
                      <span className="text-red-500 font-bold shrink-0 ml-2">{row.amount.toLocaleString()}원</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3" style={{ background: '#fff1f2' }}>
                    <span className="font-black text-sm text-black/70">합계</span>
                    <span className="font-black text-sm text-red-500">{PLANNED_TOTAL_EXPENSE.toLocaleString()}원</span>
                  </div>
                </div>
              )}
            </div>
            <div className="h-6 shrink-0" />
          </div>
        </div>
      )}
    </div>
  )
}
