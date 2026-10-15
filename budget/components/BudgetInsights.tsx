"use client";

import type { BudgetSummary, CategoryRow } from "@/lib/budget/summary";
import { pct, shortWon, won } from "@/lib/budget/summary";
import { itemLabel } from "@/lib/budget/types";

// 대시보드 오른쪽 '한눈에 보기' 지표들
export default function BudgetInsights({
  expense,
  income,
  throughLabel,
}: {
  expense: BudgetSummary;
  income: BudgetSummary | null;
  throughLabel: string;
}) {
  const health = healthOf(expense);
  const monthsElapsed = Math.round(expense.elapsedRatio * 12);
  const monthsLeft = 12 - monthsElapsed;
  const perMonthLeft = monthsLeft > 0 ? Math.max(0, expense.remaining) / monthsLeft : null;

  // 회기 안의 확정된 달(사전 집행 달 제외)의 월평균 지출과 가장 최근 달
  const fyMonths = expense.monthly.filter((m) => !m.beforeStart && m.spent !== null);
  const average = fyMonths.length > 0 ? fyMonths.reduce((s, m) => s + (m.spent ?? 0), 0) / fyMonths.length : null;
  const latest = [...expense.monthly].reverse().find((m) => m.spent !== null && m.cumulative !== null) ?? null;

  const watch = expense.rows
    .filter((r) => r.status === "over" || r.status === "fast" || r.status === "unbudgeted")
    .sort((a, b) => (b.ratio ?? 99) - (a.ratio ?? 99))
    .slice(0, 5);
  const top = [...expense.rows]
    .filter((r) => r.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);
  const topMax = top[0]?.spent ?? 0;

  return (
    <aside className="space-y-4 xl:sticky xl:top-6" aria-label="한눈에 보기">
      <div className="px-1 text-xs font-medium text-gray-500">{throughLabel}까지 기준</div>

      {/* 재정 건전성 */}
      <Card title="재정 건전성">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-bold ${health.badge}`}
            aria-hidden
          >
            {health.icon}
          </span>
          <div>
            <div className={`text-xl font-bold ${health.text}`}>{health.label}</div>
            <p className="text-xs text-gray-500 leading-relaxed">{health.reason}</p>
          </div>
        </div>
      </Card>

      {/* 남은 기간 예산 */}
      <Card title="남은 기간 예산">
        <Stat label="잔여 지출 예산" value={won(Math.max(0, expense.remaining))} />
        {expense.remaining < 0 && <p className="text-xs text-red-700">예산을 {won(-expense.remaining)} 초과했습니다.</p>}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Stat small label="남은 기간" value={`${monthsLeft}개월`} />
          <Stat small label="월 평균 사용 가능" value={perMonthLeft === null ? "-" : shortWon(Math.round(perMonthLeft))} />
        </div>
      </Card>

      {/* 월 지출 */}
      {latest && (
        <Card title="최근 월 지출">
          <Stat label={`${Number(latest.month.slice(5, 7))}월${latest.beforeStart ? "(사전)" : ""} 지출`} value={won(latest.spent ?? 0)} />
          {average !== null && (
            <p className="text-xs text-gray-500">
              월평균 {won(Math.round(average))}
              {average > 0 && !latest.beforeStart && (
                <>
                  {" · "}
                  <span className={(latest.spent ?? 0) > average * 1.2 ? "font-semibold text-red-700" : "text-gray-600"}>
                    평균의 {Math.round(((latest.spent ?? 0) / average) * 100)}%
                  </span>
                </>
              )}
            </p>
          )}
        </Card>
      )}

      {/* 수입 */}
      {income && (
        <Card title="수입 달성">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-700">{pct(income.usedRatio)}</span>
            <span className="text-xs text-gray-500">
              {won(income.totalSpent)} / {won(income.totalBudget)}
            </span>
          </div>
          <Bar ratio={income.usedRatio ?? 0} color="#1baf7a" />
          <p className="text-xs text-gray-500">회기 경과율 {pct(income.elapsedRatio)}</p>
        </Card>
      )}

      {/* 주의 항목 */}
      <Card title="주의할 항목">
        {watch.length === 0 ? (
          <p className="text-sm text-gray-500">초과하거나 빠르게 쓰고 있는 항목이 없어요.</p>
        ) : (
          <ul className="space-y-2.5">
            {watch.map((r) => (
              <WatchRow key={r.key} r={r} />
            ))}
          </ul>
        )}
      </Card>

      {/* 많이 쓴 항목 */}
      {top.length > 0 && (
        <Card title="많이 쓴 항목 TOP 5">
          <ul className="space-y-2.5">
            {top.map((r, i) => (
              <li key={r.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-gray-800" title={itemLabel(r)}>
                    <span className="mr-1.5 text-xs font-bold text-brand-600">{i + 1}</span>
                    {r.category}
                    <span className="ml-1 text-xs text-gray-400">{r.category_group}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-gray-900">{shortWon(r.spent)}</span>
                </div>
                <Bar ratio={topMax > 0 ? r.spent / topMax : 0} color="#7a24f5" />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </aside>
  );
}

function healthOf(s: BudgetSummary) {
  const over = s.rows.filter((r) => r.status === "over").length;
  const pace = s.elapsedRatio > 0 ? (s.usedRatio ?? 0) / s.elapsedRatio : null;
  if (s.remaining < 0 || over > 0) {
    return {
      label: "위험",
      icon: "!",
      badge: "bg-red-50 text-red-700",
      text: "text-red-700",
      reason: over > 0 ? `예산을 초과한 항목이 ${over}개 있습니다.` : "전체 예산을 초과했습니다.",
    };
  }
  if (pace !== null && pace > 1.3) {
    return {
      label: "위험",
      icon: "!",
      badge: "bg-red-50 text-red-700",
      text: "text-red-700",
      reason: `지출 속도가 회기 진행보다 ${Math.round((pace - 1) * 100)}% 빠릅니다.`,
    };
  }
  if (pace !== null && pace > 1.1) {
    return {
      label: "주의",
      icon: "●",
      badge: "bg-amber-50 text-amber-700",
      text: "text-amber-700",
      reason: `지출 속도가 회기 진행보다 조금 빠릅니다 (${Math.round(pace * 100)}%).`,
    };
  }
  return {
    label: "양호",
    icon: "✓",
    badge: "bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
    reason:
      pace === null
        ? "회기 시작 전입니다."
        : `집행률 ${pct(s.usedRatio)}, 회기 경과율 ${pct(s.elapsedRatio)}로 계획대로 쓰고 있습니다.`,
  };
}

function WatchRow({ r }: { r: CategoryRow }) {
  const label = r.status === "over" ? "초과" : r.status === "fast" ? "빠름" : "예산 외";
  const tone =
    r.status === "over" ? "bg-red-50 text-red-700" : r.status === "fast" ? "bg-amber-50 text-amber-800" : "bg-orange-50 text-orange-800";
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate text-gray-800" title={itemLabel(r)}>
        {r.category}
        <span className="ml-1 text-xs text-gray-400">{r.category_group}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="tabular-nums text-xs text-gray-600">{pct(r.ratio)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
      </span>
    </li>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(17,24,39,0.04)] space-y-2">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-bold tabular-nums text-gray-900 ${small ? "text-base" : "text-xl"}`}>{value}</div>
    </div>
  );
}

function Bar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="mt-1 h-1.5 rounded-full bg-gray-100">
      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%`, backgroundColor: color }} />
    </div>
  );
}
