"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fiscalMonths, fiscalYearLabel, monthLabel, shortMonthLabel } from "@/lib/budget/fiscal";
import { pct, shortWon, summarize, won, type CategoryRow, type CategoryStatus } from "@/lib/budget/summary";
import type { BudgetData } from "@/lib/budget/data";

// 차트 색: 사용액 = 강조(파랑), 예산 = 기준(회색). 상태색은 아이콘+라벨과 함께만 사용
const COLOR = {
  spent: "#2a78d6",
  budget: "#cbd5e1",
  pace: "#64748b",
  grid: "#e2e8f0",
  axis: "#64748b",
};

const STATUS: Record<CategoryStatus, { label: string; icon: string; bar: string; badge: string }> = {
  over: { label: "초과", icon: "▲", bar: "#d03b3b", badge: "bg-red-50 text-red-700 ring-red-200" },
  fast: { label: "빠름", icon: "●", bar: "#fab219", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  ok: { label: "정상", icon: "✓", bar: "#2a78d6", badge: "bg-slate-50 text-slate-600 ring-slate-200" },
  unbudgeted: { label: "예산 외", icon: "!", bar: "#ec835a", badge: "bg-orange-50 text-orange-800 ring-orange-200" },
};

export default function BudgetDashboard({
  fiscalYear,
  plans,
  items,
  months,
  entries,
  error,
}: BudgetData & { fiscalYear: number }) {
  const router = useRouter();

  const fyMonths = useMemo(() => fiscalMonths(fiscalYear), [fiscalYear]);
  const confirmedMonths = useMemo(
    () => months.map((m) => m.month.slice(0, 7)).filter((m) => fyMonths.includes(m)),
    [months, fyMonths]
  );
  const latestConfirmed = confirmedMonths.length > 0 ? confirmedMonths[confirmedMonths.length - 1] : null;
  const [throughMonth, setThroughMonth] = useState<string | null>(latestConfirmed);
  // 회기를 바꾸면 기준월을 그 회기의 마지막 확정월로
  const effectiveThrough = throughMonth && confirmedMonths.includes(throughMonth) ? throughMonth : latestConfirmed;

  const summary = useMemo(
    () => summarize(fiscalYear, items, entries, confirmedMonths, effectiveThrough),
    [fiscalYear, items, entries, confirmedMonths, effectiveThrough]
  );

  const [detailCategory, setDetailCategory] = useState<string>("");
  const detailEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          effectiveThrough &&
          e.month.slice(0, 7) <= effectiveThrough &&
          (!detailCategory || e.category === detailCategory)
      ),
    [entries, effectiveThrough, detailCategory]
  );

  const hasPlan = plans.some((p) => p.fiscal_year === fiscalYear);
  const yearOptions = Array.from(new Set([fiscalYear, ...plans.map((p) => p.fiscal_year)])).sort((a, b) => b - a);

  if (error) {
    return <Notice>데이터를 불러오지 못했습니다: {error}</Notice>;
  }

  return (
    <div className="space-y-4">
      {/* 필터: 회기 / 기준월 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={fiscalYear}
          onChange={(e) => router.push(`/?fy=${e.target.value}`)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
          aria-label="회기 선택"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {fiscalYearLabel(y)}
            </option>
          ))}
        </select>
        {confirmedMonths.length > 0 && (
          <select
            value={effectiveThrough ?? ""}
            onChange={(e) => setThroughMonth(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
            aria-label="기준월 선택"
          >
            {[...confirmedMonths].reverse().map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}까지 누적
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasPlan ? (
        <Notice>
          {fiscalYearLabel(fiscalYear)} 예산안이 아직 없습니다.{" "}
          <Link href="/upload" className="underline font-medium">
            예산안 업로드
          </Link>
          부터 진행해주세요.
        </Notice>
      ) : (
        <>
          {!effectiveThrough && (
            <Notice>
              이 회기에 확정된 월별 장부가 아직 없습니다.{" "}
              <Link href="/upload?tab=ledger" className="underline font-medium">
                월별 장부 업로드
              </Link>
              를 하면 사용 현황이 표시됩니다.
            </Notice>
          )}

          {/* 핵심 지표 */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="총 예산" value={won(summary.totalBudget)} />
            <Kpi
              label={effectiveThrough ? `누적 사용액 (~${shortMonthLabel(effectiveThrough)})` : "누적 사용액"}
              value={won(summary.totalSpent)}
            />
            <Kpi
              label={summary.remaining < 0 ? "예산 초과액" : "잔여 예산"}
              value={won(Math.abs(summary.remaining))}
              tone={summary.remaining < 0 ? "text-red-700" : undefined}
            />
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">집행률 / 회기 경과율</div>
              <div className="text-2xl font-bold text-slate-900">
                {pct(summary.usedRatio)}
                <span className="text-sm font-medium text-slate-500"> / {pct(summary.elapsedRatio)}</span>
              </div>
              <ProgressBar ratio={summary.usedRatio ?? 0} marker={summary.elapsedRatio} color={COLOR.spent} />
            </div>
          </section>

          {/* 항목별 예산 대비 사용액 */}
          <Panel
            title="항목별 예산 대비 사용액"
            subtitle={effectiveThrough ? `${monthLabel(effectiveThrough)}까지 누적` : undefined}
          >
            <CategoryBarChart rows={summary.rows} />
          </Panel>

          {/* 항목별 집행률 표 */}
          <Panel
            title="항목별 집행률"
            subtitle={`세로선 = 회기 경과율 ${pct(summary.elapsedRatio)}. 집행률이 경과율보다 10%p 이상 높으면 '빠름'`}
          >
            <CategoryTable rows={summary.rows} elapsedRatio={summary.elapsedRatio} />
          </Panel>

          {/* 월별 누적 추이 */}
          <Panel title="월별 누적 사용액" subtitle="점선 = 예산을 12개월에 균등하게 쓸 때의 기준선">
            <MonthlyChart data={summary.monthly} />
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 mt-3">
              {summary.monthly.map((m) => (
                <div
                  key={m.month}
                  className={`rounded-lg px-2 py-1.5 text-center ring-1 ${
                    m.confirmed ? "bg-white ring-slate-200" : "bg-slate-50 ring-slate-100 text-slate-400"
                  }`}
                >
                  <div className="text-xs font-medium">{shortMonthLabel(m.month)}</div>
                  <div className="text-[11px] tabular-nums">{m.spent === null ? "미확정" : shortWon(m.spent)}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* 세부 지출 내역 */}
          {effectiveThrough && (
            <Panel title="세부 지출 내역" subtitle={`${monthLabel(effectiveThrough)}까지`}>
              <select
                value={detailCategory}
                onChange={(e) => setDetailCategory(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm mb-2"
                aria-label="항목 선택"
              >
                <option value="">전체 항목</option>
                {summary.rows.map((r) => (
                  <option key={r.category} value={r.category}>
                    {r.category}
                  </option>
                ))}
              </select>
              <div className="overflow-auto max-h-[420px]">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="text-left px-2 py-1.5 whitespace-nowrap">날짜</th>
                      <th className="text-left px-2 py-1.5 whitespace-nowrap">항목</th>
                      <th className="text-left px-2 py-1.5">내용</th>
                      <th className="text-right px-2 py-1.5 whitespace-nowrap">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailEntries.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100">
                        <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">
                          {e.entry_date ?? monthLabel(e.month.slice(0, 7))}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{e.category}</td>
                        <td className="px-2 py-1.5">{e.description}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">{won(e.amount)}</td>
                      </tr>
                    ))}
                    {detailEntries.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-6 text-center text-slate-400">
                          내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function CategoryBarChart({ rows }: { rows: CategoryRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">예산 항목이 없습니다.</p>;
  const height = Math.max(160, rows.length * 52 + 48);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barGap={2}>
          <CartesianGrid horizontal={false} stroke={COLOR.grid} />
          <XAxis
            type="number"
            tickFormatter={shortWon}
            tick={{ fontSize: 11, fill: COLOR.axis }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={112}
            tick={{ fontSize: 12, fill: "#334155" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as CategoryRow;
              return (
                <div className="bg-white rounded-lg shadow-md ring-1 ring-slate-200 px-3 py-2 text-xs space-y-0.5">
                  <div className="font-semibold text-slate-800">{r.category}</div>
                  <div className="text-slate-600">예산 {won(r.budget)}</div>
                  <div className="text-slate-600">사용 {won(r.spent)}</div>
                  <div className="text-slate-600">
                    집행률 {pct(r.ratio)} · {STATUS[r.status].label}
                  </div>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="square"
            wrapperStyle={{ fontSize: 12, color: "#475569" }}
          />
          <Bar dataKey="budget" name="예산" fill={COLOR.budget} radius={[0, 4, 4, 0]} barSize={14} />
          <Bar dataKey="spent" name="사용액" fill={COLOR.spent} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryTable({ rows, elapsedRatio }: { rows: CategoryRow[]; elapsedRatio: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs">
          <tr>
            <th className="text-left px-2 py-1.5 whitespace-nowrap">항목</th>
            <th className="text-right px-2 py-1.5 whitespace-nowrap">예산</th>
            <th className="text-right px-2 py-1.5 whitespace-nowrap">사용액</th>
            <th className="text-right px-2 py-1.5 whitespace-nowrap">잔액</th>
            <th className="text-left px-2 py-1.5 min-w-[160px]">집행률</th>
            <th className="text-left px-2 py-1.5 whitespace-nowrap">상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = STATUS[r.status];
            return (
              <tr key={r.category} className="border-b border-slate-100">
                <td className="px-2 py-2 whitespace-nowrap font-medium text-slate-800">{r.category}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums">{won(r.budget)}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums">{won(r.spent)}</td>
                <td
                  className={`px-2 py-2 text-right whitespace-nowrap tabular-nums ${
                    r.remaining < 0 ? "text-red-700" : ""
                  }`}
                >
                  {won(r.remaining)}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <ProgressBar ratio={r.ratio ?? (r.spent > 0 ? 1 : 0)} marker={elapsedRatio} color={s.bar} />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-slate-600">{pct(r.ratio)}</span>
                  </div>
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${s.badge}`}>
                    <span aria-hidden>{s.icon}</span>
                    {s.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyChart({ data }: { data: ReturnType<typeof summarize>["monthly"] }) {
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke={COLOR.grid} />
          <XAxis
            dataKey="month"
            tickFormatter={shortMonthLabel}
            tick={{ fontSize: 11, fill: COLOR.axis }}
            axisLine={{ stroke: COLOR.grid }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={shortWon}
            tick={{ fontSize: 11, fill: COLOR.axis }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const m = payload[0].payload as ReturnType<typeof summarize>["monthly"][number];
              return (
                <div className="bg-white rounded-lg shadow-md ring-1 ring-slate-200 px-3 py-2 text-xs space-y-0.5">
                  <div className="font-semibold text-slate-800">{monthLabel(String(label))}</div>
                  <div className="text-slate-600">그 달 사용 {m.spent === null ? "미확정" : won(m.spent)}</div>
                  {m.cumulative !== null && <div className="text-slate-600">누적 사용 {won(m.cumulative)}</div>}
                  <div className="text-slate-600">균등 기준선 {won(m.pace)}</div>
                </div>
              );
            }}
          />
          <Legend verticalAlign="top" align="right" height={28} wrapperStyle={{ fontSize: 12, color: "#475569" }} />
          <Line
            type="linear"
            dataKey="pace"
            name="균등 기준선"
            stroke={COLOR.pace}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="cumulative"
            name="누적 사용액"
            stroke={COLOR.spent}
            strokeWidth={2}
            dot={{ r: 4, fill: COLOR.spent, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressBar({ ratio, marker, color }: { ratio: number; marker?: number; color: string }) {
  const width = Math.min(1, Math.max(0, ratio)) * 100;
  return (
    <div className="relative h-2 mt-2 rounded-full bg-slate-100">
      <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      {marker !== undefined && marker > 0 && (
        <div
          className="absolute -top-1 h-4 w-0.5 bg-slate-500"
          style={{ left: `${Math.min(1, marker) * 100}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg sm:text-2xl font-bold tabular-nums break-all ${tone ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow-sm p-4 text-sm text-slate-600">{children}</div>;
}
