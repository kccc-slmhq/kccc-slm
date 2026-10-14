import { fiscalMonthIndex, fiscalMonths } from "./fiscal";
import type { BudgetItem, LedgerEntry } from "./types";

export type CategoryStatus = "over" | "fast" | "ok" | "unbudgeted";

export type CategoryRow = {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  ratio: number | null; // 집행률 (예산 0이면 null)
  status: CategoryStatus;
};

export type MonthPoint = {
  month: string; // YYYY-MM
  confirmed: boolean;
  spent: number | null; // 그 달 사용액 (미확정이면 null)
  cumulative: number | null; // 누적 사용액 (기준월 이후는 null)
  pace: number; // 예산을 12개월에 균등하게 쓴다고 했을 때의 누적 기준선
};

export type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  usedRatio: number | null;
  elapsedRatio: number; // 기준월까지 회기 경과율 (n/12)
  rows: CategoryRow[];
  monthly: MonthPoint[];
};

// 집행률이 회기 경과율보다 이만큼 이상 앞서면 "빠름"
export const FAST_MARGIN = 0.1;

export function summarize(
  fiscalYear: number,
  items: BudgetItem[],
  entries: LedgerEntry[],
  confirmedMonths: string[], // YYYY-MM
  throughMonth: string | null // 이 달까지 누적. null 이면 확정된 달 없음
): BudgetSummary {
  const months = fiscalMonths(fiscalYear);
  const confirmed = new Set(confirmedMonths);
  const elapsedRatio = throughMonth ? fiscalMonthIndex(throughMonth) / 12 : 0;

  const fyItems = items.filter((i) => i.fiscal_year === fiscalYear).sort((a, b) => a.sort_order - b.sort_order);
  const totalBudget = fyItems.reduce((s, i) => s + i.amount, 0);

  const spentByMonth = new Map<string, number>();
  const spentByCategory = new Map<string, number>();
  for (const e of entries) {
    const month = e.month.slice(0, 7);
    if (!months.includes(month)) continue;
    spentByMonth.set(month, (spentByMonth.get(month) ?? 0) + e.amount);
    if (throughMonth && month <= throughMonth) {
      spentByCategory.set(e.category, (spentByCategory.get(e.category) ?? 0) + e.amount);
    }
  }

  const budgetCategories = new Set(fyItems.map((i) => i.category));
  const rows: CategoryRow[] = [
    ...fyItems.map((i) => ({ category: i.category, budget: i.amount })),
    // 예산에 없는 항목으로 기록된 지출 (미분류 포함)
    ...[...spentByCategory.keys()]
      .filter((c) => !budgetCategories.has(c))
      .map((c) => ({ category: c, budget: 0 })),
  ].map(({ category, budget }) => {
    const spent = spentByCategory.get(category) ?? 0;
    const ratio = budget > 0 ? spent / budget : null;
    let status: CategoryStatus = "ok";
    if (budget === 0) status = spent > 0 ? "unbudgeted" : "ok";
    else if (spent > budget) status = "over";
    else if (ratio !== null && ratio > elapsedRatio + FAST_MARGIN) status = "fast";
    return { category, budget, spent, remaining: budget - spent, ratio, status };
  });

  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);

  let running = 0;
  const monthly: MonthPoint[] = months.map((month, i) => {
    const isConfirmed = confirmed.has(month);
    const spent = isConfirmed ? spentByMonth.get(month) ?? 0 : null;
    const inRange = throughMonth !== null && month <= throughMonth;
    if (inRange) running += spent ?? 0;
    return {
      month,
      confirmed: isConfirmed,
      spent,
      cumulative: inRange ? running : null,
      pace: Math.round((totalBudget * (i + 1)) / 12),
    };
  });

  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    usedRatio: totalBudget > 0 ? totalSpent / totalBudget : null,
    elapsedRatio,
    rows,
    monthly,
  };
}

export function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

// 그래프 축/라벨용 짧은 금액 (예: 1,250만)
export function shortWon(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(abs % 100_000_000 === 0 ? 0 : 1)}억`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000).toLocaleString("ko-KR")}만`;
  return `${sign}${abs.toLocaleString("ko-KR")}`;
}

export function pct(ratio: number | null): string {
  return ratio === null ? "-" : `${Math.round(ratio * 100)}%`;
}
