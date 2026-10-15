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
import { fiscalYearLabel, isBeforeFiscalStart, monthLabel, shortMonthLabel } from "@/lib/budget/fiscal";
import {
  pct,
  shortWon,
  summarize,
  won,
  type CategoryRow,
  type CategoryStatus,
  type GroupRow,
} from "@/lib/budget/summary";
import { KIND_LABEL, itemKey, kindOf, type Kind } from "@/lib/budget/types";
import BudgetInsights from "./BudgetInsights";
import { EDIT_NOTICE, useEditLock } from "./EditLock";
import type { BudgetData } from "@/lib/budget/data";

// 차트 색: 사용액 = 강조(파랑), 예산 = 기준(회색). 상태색은 아이콘+라벨과 함께만 사용
const COLOR = {
  spent: "#7a24f5",
  income: "#1baf7a",
  budget: "#e5e7eb",
  pace: "#64748b",
  grid: "#e2e8f0",
  axis: "#64748b",
};

const STATUS: Record<CategoryStatus, { label: string; icon: string; bar: string; badge: string }> = {
  over: { label: "초과", icon: "▲", bar: "#d03b3b", badge: "bg-red-50 text-red-700 ring-red-200" },
  fast: { label: "빠름", icon: "●", bar: "#fab219", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  ok: { label: "정상", icon: "✓", bar: "#7a24f5", badge: "bg-gray-50 text-gray-600 ring-gray-200" },
  unbudgeted: { label: "예산 외", icon: "!", bar: "#ec835a", badge: "bg-orange-50 text-orange-800 ring-orange-200" },
};

// 수입은 '예산보다 많이 들어온 것'이 좋은 일이라 상태 이름을 다르게 보여줌
const INCOME_STATUS: Record<CategoryStatus, { label: string; icon: string; bar: string; badge: string }> = {
  over: { label: "초과 달성", icon: "▲", bar: "#0ca30c", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  fast: { label: "순조", icon: "●", bar: "#1baf7a", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  ok: { label: "진행 중", icon: "·", bar: "#1baf7a", badge: "bg-gray-50 text-gray-600 ring-gray-200" },
  unbudgeted: { label: "예산 외", icon: "!", bar: "#ec835a", badge: "bg-orange-50 text-orange-800 ring-orange-200" },
};

function statusMeta(kind: Kind, status: CategoryStatus) {
  return (kind === "income" ? INCOME_STATUS : STATUS)[status];
}

const WORDS: Record<Kind, { spent: string; ratio: string; title: string }> = {
  expense: { spent: "사용액", ratio: "집행률", title: "예산 대비 사용액" },
  income: { spent: "수입액", ratio: "달성률", title: "수입 예산 대비 실제 수입" },
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

  // 이 회기로 확정된 달 (회기 시작 전에 미리 쓴 달 포함)
  const confirmedMonths = useMemo(
    () =>
      months
        .filter((m) => m.fiscal_year === fiscalYear)
        .map((m) => m.month.slice(0, 7))
        .sort(),
    [months, fiscalYear]
  );
  const monthName = (m: string) => `${monthLabel(m)}${isBeforeFiscalStart(fiscalYear, m) ? " (사전)" : ""}`;
  const latestConfirmed = confirmedMonths.length > 0 ? confirmedMonths[confirmedMonths.length - 1] : null;
  const [throughMonth, setThroughMonth] = useState<string | null>(latestConfirmed);
  // 회기를 바꾸면 기준월을 그 회기의 마지막 확정월로
  const effectiveThrough = throughMonth && confirmedMonths.includes(throughMonth) ? throughMonth : latestConfirmed;

  const summary = useMemo(
    () => summarize(fiscalYear, items, entries, confirmedMonths, effectiveThrough, "expense"),
    [fiscalYear, items, entries, confirmedMonths, effectiveThrough]
  );
  const incomeSummary = useMemo(
    () => summarize(fiscalYear, items, entries, confirmedMonths, effectiveThrough, "income"),
    [fiscalYear, items, entries, confirmedMonths, effectiveThrough]
  );
  const hasIncome = incomeSummary.totalBudget > 0 || incomeSummary.totalSpent > 0;
  // 카테고리 그래프·표를 지출/수입 중 무엇으로 볼지
  const [view, setView] = useState<Kind>("expense");
  const viewSummary = view === "income" ? incomeSummary : summary;

  // 세부 내역 필터: "" (전체) | "g:큰카테고리" | "i:항목키", 그리고 특정 달
  const [detailFilter, setDetailFilter] = useState<string>("");
  const [detailMonth, setDetailMonth] = useState<string>("");
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null);

  const editLock = useEditLock();

  async function deleteMonth(m: string) {
    if (!window.confirm(`${monthLabel(m)} 장부를 삭제할까요? 이 달의 내역이 모두 지워집니다.`)) return;
    setDeletingMonth(m);
    const res = await fetch(`/api/ledger?month=${m}`, { method: "DELETE" }).catch(() => null);
    setDeletingMonth(null);
    if (!res?.ok) {
      const body = await res?.json().catch(() => ({}));
      window.alert(body?.error ?? "삭제에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  // 확정된 달별 건수·합계
  const monthStats = useMemo(() => {
    const map = new Map<string, { count: number; expense: number; income: number }>();
    for (const e of entries) {
      const m = e.month.slice(0, 7);
      const cur = map.get(m) ?? { count: 0, expense: 0, income: 0 };
      cur.count += 1;
      cur[kindOf(e)] += e.amount;
      map.set(m, cur);
    }
    return map;
  }, [entries]);
  // 항목 → 큰 카테고리 (지출·수입 모두)
  const groupOfKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of [...summary.groups, ...incomeSummary.groups]) for (const r of g.items) map.set(r.key, g.group);
    return map;
  }, [summary.groups, incomeSummary.groups]);
  const detailEntries = useMemo(
    () =>
      entries.filter((e) => {
        if (!effectiveThrough || e.month.slice(0, 7) > effectiveThrough) return false;
        if (detailMonth && e.month.slice(0, 7) !== detailMonth) return false;
        if (!detailFilter) return true;
        const key = itemKey(e);
        if (detailFilter.startsWith("g:")) return `${kindOf(e)}:${groupOfKey.get(key)}` === detailFilter.slice(2);
        return key === detailFilter.slice(2);
      }),
    [entries, effectiveThrough, detailFilter, detailMonth, groupOfKey]
  );

  const hasPlan = plans.some((p) => p.fiscal_year === fiscalYear);
  const yearOptions = Array.from(new Set([fiscalYear, ...plans.map((p) => p.fiscal_year)])).sort((a, b) => b - a);

  if (error) {
    return <Notice>데이터를 불러오지 못했습니다: {error}</Notice>;
  }

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6 xl:items-start space-y-6 xl:space-y-0">
    <div className="space-y-6 min-w-0">
      {/* 필터: 회기 / 기준월 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={fiscalYear}
          onChange={(e) => router.push(`/?fy=${e.target.value}`)}
          className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm"
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
            className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm"
            aria-label="기준월 선택"
          >
            {[...confirmedMonths].reverse().map((m) => (
              <option key={m} value={m}>
                {monthName(m)}까지 누적
              </option>
            ))}
          </select>
        )}
        {hasPlan && (
          <Link
            href={`/upload?tab=budget&edit=${fiscalYear}`}
            className="ml-auto rounded-full px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
          >
            예산안 수정
          </Link>
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
            <Kpi
              label={effectiveThrough ? `누적 지출 (~${shortMonthLabel(effectiveThrough)})` : "누적 지출"}
              value={won(summary.totalSpent)}
              sub={`예산 ${won(summary.totalBudget)} · ${summary.remaining < 0 ? "초과" : "잔여"} ${won(
                Math.abs(summary.remaining)
              )}`}
            />
            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
              <div className="text-xs text-gray-500 mb-1">집행률 / 회기 경과율</div>
              <div className="text-2xl font-bold text-gray-900">
                {pct(summary.usedRatio)}
                <span className="text-sm font-medium text-gray-500"> / {pct(summary.elapsedRatio)}</span>
              </div>
              <ProgressBar ratio={summary.usedRatio ?? 0} marker={summary.elapsedRatio} color={COLOR.spent} />
            </div>
            <Kpi
              label={effectiveThrough ? `누적 수입 (~${shortMonthLabel(effectiveThrough)})` : "누적 수입"}
              value={won(incomeSummary.totalSpent)}
              tone="text-emerald-700"
              sub={
                incomeSummary.totalBudget > 0
                  ? `수입 예산 ${won(incomeSummary.totalBudget)} · 달성 ${pct(incomeSummary.usedRatio)}`
                  : "수입 예산 없음"
              }
            />
            <Kpi
              label="수입 − 지출"
              value={`${incomeSummary.totalSpent - summary.totalSpent < 0 ? "−" : "+"}${won(
                Math.abs(incomeSummary.totalSpent - summary.totalSpent)
              )}`}
              tone={incomeSummary.totalSpent - summary.totalSpent < 0 ? "text-red-700" : "text-gray-900"}
              sub="확정된 장부 기준 (이월금 제외)"
            />
          </section>

          {/* 지출 / 수입 보기 전환 */}
          {hasIncome && (
            <div className="flex gap-1.5" role="tablist" aria-label="지출·수입 보기">
              {(["expense", "income"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={view === k}
                  onClick={() => setView(k)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                    view === k
                      ? k === "income"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-brand-50 text-brand-600 border-brand-100"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          )}

          {/* 항목별 예산 대비 사용액 */}
          <Panel
            title={`카테고리별 ${WORDS[view].title}`}
            subtitle={effectiveThrough ? `${monthLabel(effectiveThrough)}까지 누적` : undefined}
          >
            <GroupBarChart groups={viewSummary.groups} kind={view} />
          </Panel>

          {/* 항목별 집행률 표 */}
          <Panel
            title={`카테고리·항목별 ${WORDS[view].ratio}`}
            subtitle={
              view === "income"
                ? `세로선 = 회기 경과율 ${pct(summary.elapsedRatio)}`
                : `세로선 = 회기 경과율 ${pct(summary.elapsedRatio)}. 집행률이 경과율보다 10%p 이상 높으면 '빠름'`
            }
          >
            <GroupTable key={view} groups={viewSummary.groups} elapsedRatio={summary.elapsedRatio} kind={view} />
          </Panel>

          {/* 월별 누적 추이 */}
          <Panel title="월별 누적 지출·수입" subtitle="점선 = 지출 예산을 12개월에 균등하게 쓸 때의 기준선">
            <MonthlyChart data={summary.monthly} income={hasIncome ? incomeSummary.monthly : null} />
            <div
              className={`grid grid-cols-4 sm:grid-cols-6 gap-1.5 mt-3 ${
                summary.monthly.length > 12 ? "lg:grid-cols-[repeat(13,minmax(0,1fr))]" : "lg:grid-cols-12"
              }`}
            >
              {summary.monthly.map((m) => (
                <div
                  key={m.month}
                  className={`rounded-lg px-2 py-1.5 text-center ring-1 ${
                    m.confirmed ? "bg-white ring-gray-200" : "bg-gray-50 ring-gray-100 text-gray-400"
                  }`}
                >
                  <div className="text-xs font-medium">
                    {shortMonthLabel(m.month)}
                    {m.beforeStart ? "(사전)" : ""}
                  </div>
                  <div className="text-[11px] tabular-nums">{m.spent === null ? "미확정" : shortWon(m.spent)}</div>
                  {(monthStats.get(m.month)?.income ?? 0) > 0 && (
                    <div className="text-[11px] tabular-nums text-emerald-700">
                      +{shortWon(monthStats.get(m.month)?.income ?? 0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* 확정된 장부: 보기 / 수정 / 삭제 */}
          <Panel title="확정된 월별 장부" subtitle="보기 = 아래 세부 내역에서 그 달만, 수정 = 장부 편집 화면">
            <p className="mb-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <span aria-hidden>🔒</span>
              {EDIT_NOTICE}
              {editLock.unlocked && <span className="ml-auto font-semibold text-emerald-700">확인됨</span>}
            </p>
            {confirmedMonths.length === 0 ? (
              <p className="text-sm text-gray-400">확정된 장부가 없습니다.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {[...confirmedMonths].reverse().map((m) => {
                  const st = monthStats.get(m) ?? { count: 0, expense: 0, income: 0 };
                  return (
                    <li key={m} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                      <span className="w-36 font-semibold text-gray-900">{monthName(m)}</span>
                      <span className="text-sm text-gray-500">{st.count}건</span>
                      <span className="text-sm font-medium tabular-nums text-gray-900">지출 {won(st.expense)}</span>
                      {st.income > 0 && (
                        <span className="text-sm font-medium tabular-nums text-emerald-700">수입 {won(st.income)}</span>
                      )}
                      <span className="ml-auto flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailMonth(m);
                            setDetailFilter("");
                            document.getElementById("detail")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                        >
                          보기
                        </button>
                        <button
                          type="button"
                          onClick={() => editLock.requireUnlock(() => router.push(`/upload?tab=ledger&month=${m}`))}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-brand-100 hover:bg-brand-50"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => editLock.requireUnlock(() => deleteMonth(m))}
                          disabled={deletingMonth === m}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingMonth === m ? "삭제 중..." : "삭제"}
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* 세부 지출 내역 */}
          {effectiveThrough && (
            <Panel title="세부 내역" subtitle={`${monthName(effectiveThrough)}까지`}>
              <div id="detail" className="flex flex-wrap gap-2 mb-2">
              <select
                value={detailMonth}
                onChange={(e) => setDetailMonth(e.target.value)}
                className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm"
                aria-label="달 선택"
              >
                <option value="">모든 달</option>
                {confirmedMonths
                  .filter((m) => m <= effectiveThrough)
                  .map((m) => (
                    <option key={m} value={m}>
                      {monthName(m)}
                    </option>
                  ))}
              </select>
              <select
                value={detailFilter}
                onChange={(e) => setDetailFilter(e.target.value)}
                className="h-9 max-w-full rounded-xl border border-gray-200 bg-white px-2 text-sm"
                aria-label="카테고리·항목 선택"
              >
                <option value="">전체</option>
                {(["expense", "income"] as const).flatMap((k) =>
                  (k === "income" ? incomeSummary : summary).groups.map((g) => (
                    <optgroup key={`${k}:${g.group}`} label={`[${KIND_LABEL[k]}] ${g.group}`}>
                      <option value={`g:${k}:${g.group}`}>{g.group} 전체</option>
                      {g.items.map((r) => (
                        <option key={r.key} value={`i:${r.key}`}>
                          {r.category}
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
              </div>
              <div className="overflow-auto max-h-[420px]">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="sticky top-0 bg-gray-50 text-gray-500 text-xs">
                    <tr>
                      <th className="text-left px-2 py-1.5 whitespace-nowrap">날짜</th>
                      <th className="text-left px-2 py-1.5 whitespace-nowrap">구분</th>
                      <th className="text-left px-2 py-1.5 whitespace-nowrap">카테고리</th>
                      <th className="text-left px-2 py-1.5 whitespace-nowrap">항목</th>
                      <th className="text-left px-2 py-1.5">내용</th>
                      <th className="text-right px-2 py-1.5 whitespace-nowrap">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailEntries.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">
                          {e.entry_date ?? monthLabel(e.month.slice(0, 7))}
                        </td>
                        <td
                          className={`px-2 py-1.5 whitespace-nowrap font-medium ${
                            kindOf(e) === "income" ? "text-emerald-700" : "text-gray-600"
                          }`}
                        >
                          {KIND_LABEL[kindOf(e)]}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">
                          {groupOfKey.get(itemKey(e)) ?? ""}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{e.category}</td>
                        <td className="px-2 py-1.5">{e.description}</td>
                        <td
                          className={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${
                            kindOf(e) === "income" ? "text-emerald-700" : ""
                          }`}
                        >
                          {kindOf(e) === "income" ? "+" : ""}
                          {won(e.amount)}
                        </td>
                      </tr>
                    ))}
                    {detailEntries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-2 py-6 text-center text-gray-400">
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
    {editLock.dialog}
    {hasPlan && effectiveThrough && (
      <BudgetInsights expense={summary} income={hasIncome ? incomeSummary : null} throughLabel={monthName(effectiveThrough)} />
    )}
    </div>
  );
}

function GroupBarChart({ groups, kind }: { groups: GroupRow[]; kind: Kind }) {
  if (groups.length === 0) return <p className="text-sm text-gray-400">예산 항목이 없습니다.</p>;
  const height = Math.max(160, groups.length * 52 + 48);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={groups} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barGap={2}>
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
            dataKey="group"
            width={120}
            tick={{ fontSize: 12, fill: "#334155" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as GroupRow;
              return (
                <div className="bg-white rounded-lg shadow-md ring-1 ring-gray-200 px-3 py-2 text-xs space-y-0.5">
                  <div className="font-semibold text-gray-800">{r.group}</div>
                  <div className="text-gray-600">예산 {won(r.budget)}</div>
                  <div className="text-gray-600">
                    {WORDS[kind].spent} {won(r.spent)}
                  </div>
                  <div className="text-gray-600">
                    {WORDS[kind].ratio} {pct(r.ratio)} · {statusMeta(kind, r.status).label}
                  </div>
                  <div className="text-gray-400">세부 항목 {r.items.length}개</div>
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
          <Bar
            dataKey="spent"
            name={WORDS[kind].spent}
            fill={kind === "income" ? COLOR.income : COLOR.spent}
            radius={[0, 4, 4, 0]}
            barSize={14}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GroupTable({ groups, elapsedRatio, kind }: { groups: GroupRow[]; elapsedRatio: number; kind: Kind }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const allOpen = groups.length > 0 && groups.every((g) => open.has(g.group));
  const toggle = (group: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.group)))}
          className="rounded-full px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
        >
          {allOpen ? "모두 접기" : "세부 항목 모두 펼치기"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">카테고리 / 항목</th>
              <th className="text-right px-2 py-1.5 whitespace-nowrap">예산</th>
              <th className="text-right px-2 py-1.5 whitespace-nowrap">{WORDS[kind].spent}</th>
              <th className="text-right px-2 py-1.5 whitespace-nowrap">잔액</th>
              <th className="text-left px-2 py-1.5 min-w-[160px]">{WORDS[kind].ratio}</th>
              <th className="text-left px-2 py-1.5 whitespace-nowrap">상태</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const isOpen = open.has(g.group);
              return (
                <GroupRows
                  key={g.group}
                  g={g}
                  isOpen={isOpen}
                  onToggle={() => toggle(g.group)}
                  elapsedRatio={elapsedRatio}
                  kind={kind}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({
  g,
  isOpen,
  onToggle,
  elapsedRatio,
  kind,
}: {
  g: GroupRow;
  isOpen: boolean;
  onToggle: () => void;
  elapsedRatio: number;
  kind: Kind;
}) {
  return (
    <>
      <tr className="border-b border-gray-100 bg-brand-50/40 cursor-pointer hover:bg-brand-50" onClick={onToggle}>
        <td className="px-2 py-2.5 whitespace-nowrap font-bold text-gray-900">
          <button type="button" aria-expanded={isOpen} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block text-[10px] text-brand-600 transition-transform ${isOpen ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            {g.group}
            <span className="text-xs font-medium text-gray-400">{g.items.length}</span>
          </button>
        </td>
        <MoneyCells row={g} elapsedRatio={elapsedRatio} kind={kind} bold />
      </tr>
      {isOpen &&
        g.items.map((r) => (
          <tr key={r.key} className="border-b border-gray-100">
            <td className="pl-8 pr-2 py-2 whitespace-nowrap text-gray-700">
              {r.category}
              {r.oneTime && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                  일회성
                </span>
              )}
            </td>
            <MoneyCells row={r} elapsedRatio={elapsedRatio} kind={kind} />
          </tr>
        ))}
    </>
  );
}

function MoneyCells({
  row,
  elapsedRatio,
  kind,
  bold,
}: {
  row: Pick<CategoryRow, "budget" | "spent" | "remaining" | "ratio" | "status">;
  elapsedRatio: number;
  kind: Kind;
  bold?: boolean;
}) {
  const s = statusMeta(kind, row.status);
  const weight = bold ? "font-semibold text-gray-900" : "";
  return (
    <>
      <td className={`px-2 py-2 text-right whitespace-nowrap tabular-nums ${weight}`}>{won(row.budget)}</td>
      <td className={`px-2 py-2 text-right whitespace-nowrap tabular-nums ${weight}`}>{won(row.spent)}</td>
      <td
        className={`px-2 py-2 text-right whitespace-nowrap tabular-nums ${weight} ${
          row.remaining < 0 && kind === "expense" ? "text-red-700" : ""
        }`}
      >
        {won(row.remaining)}
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar ratio={row.ratio ?? (row.spent > 0 ? 1 : 0)} marker={elapsedRatio} color={s.bar} />
          </div>
          <span className="w-10 text-right text-xs tabular-nums text-gray-600">{pct(row.ratio)}</span>
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${s.badge}`}>
          <span aria-hidden>{s.icon}</span>
          {s.label}
        </span>
      </td>
    </>
  );
}

type MonthPointWithIncome = ReturnType<typeof summarize>["monthly"][number] & {
  incomeCumulative: number | null;
  incomeSpent: number | null;
};

function MonthlyChart({
  data: expenseData,
  income,
}: {
  data: ReturnType<typeof summarize>["monthly"];
  income: ReturnType<typeof summarize>["monthly"] | null;
}) {
  const data: MonthPointWithIncome[] = expenseData.map((m) => {
    const inc = income?.find((x) => x.month === m.month);
    return { ...m, incomeCumulative: inc?.cumulative ?? null, incomeSpent: inc?.spent ?? null };
  });
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke={COLOR.grid} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string, i: number) =>
              `${shortMonthLabel(m)}${data[i]?.beforeStart ? "(사전)" : ""}`
            }
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
              const m = payload[0].payload as MonthPointWithIncome;
              return (
                <div className="bg-white rounded-lg shadow-md ring-1 ring-gray-200 px-3 py-2 text-xs space-y-0.5">
                  <div className="font-semibold text-gray-800">
                    {monthLabel(String(label))}
                    {m.beforeStart ? " (회기 시작 전 미리 쓴 금액)" : ""}
                  </div>
                  <div className="text-gray-600">그 달 지출 {m.spent === null ? "미확정" : won(m.spent)}</div>
                  {m.cumulative !== null && <div className="text-gray-600">누적 지출 {won(m.cumulative)}</div>}
                  {income && m.incomeCumulative !== null && (
                    <div className="text-emerald-700">누적 수입 {won(m.incomeCumulative)}</div>
                  )}
                  <div className="text-gray-600">균등 기준선 {won(m.pace)}</div>
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
            name="누적 지출"
            stroke={COLOR.spent}
            strokeWidth={2}
            dot={{ r: 4, fill: COLOR.spent, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {income && (
            <Line
              type="linear"
              dataKey="incomeCumulative"
              name="누적 수입"
              stroke={COLOR.income}
              strokeWidth={2}
              dot={{ r: 4, fill: COLOR.income, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressBar({ ratio, marker, color }: { ratio: number; marker?: number; color: string }) {
  const width = Math.min(1, Math.max(0, ratio)) * 100;
  return (
    <div className="relative h-2 mt-2 rounded-full bg-gray-100">
      <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      {marker !== undefined && marker > 0 && (
        <div
          className="absolute -top-1 h-4 w-0.5 bg-gray-500"
          style={{ left: `${Math.min(1, marker) * 100}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}

function Kpi({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg sm:text-2xl font-bold tabular-nums break-all ${tone ?? "text-gray-900"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2 px-1">
        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">{children}</div>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl p-5 text-sm text-gray-600 text-center shadow-[0_1px_3px_rgba(17,24,39,0.04)]">{children}</div>;
}
