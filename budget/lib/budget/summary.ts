import { fiscalMonthIndex, fiscalMonths } from "./fiscal";
import { itemKey, type BudgetItem, type LedgerEntry } from "./types";

export type CategoryStatus = "over" | "fast" | "ok" | "unbudgeted";

export type CategoryRow = {
  key: string; // itemKey
  category_group: string;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  ratio: number | null; // 집행률 (예산 0이면 null)
  status: CategoryStatus;
};

// 큰 카테고리 단위 합계 + 그 안의 세부 항목
export type GroupRow = {
  group: string; // 화면 표시용 이름 (큰 카테고리가 없으면 "예산 외" 또는 "항목")
  budget: number;
  spent: number;
  remaining: number;
  ratio: number | null;
  status: CategoryStatus;
  items: CategoryRow[];
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
  groups: GroupRow[];
  monthly: MonthPoint[];
};

// 큰 카테고리가 없는 항목(예전 예산안 / 미분류)을 묶어 보여줄 이름
export const NO_GROUP_LABEL = "기타";
export const UNBUDGETED_GROUP_LABEL = "예산 외";

function statusOf(budget: number, spent: number, elapsedRatio: number): CategoryStatus {
  if (budget === 0) return spent > 0 ? "unbudgeted" : "ok";
  if (spent > budget) return "over";
  if (spent / budget > elapsedRatio + FAST_MARGIN) return "fast";
  return "ok";
}

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
  const spentByItem = new Map<string, { category_group: string; category: string; amount: number }>();
  for (const e of entries) {
    const month = e.month.slice(0, 7);
    if (!months.includes(month)) continue;
    spentByMonth.set(month, (spentByMonth.get(month) ?? 0) + e.amount);
    if (throughMonth && month <= throughMonth) {
      const key = itemKey(e);
      const cur = spentByItem.get(key) ?? { category_group: e.category_group, category: e.category, amount: 0 };
      cur.amount += e.amount;
      spentByItem.set(key, cur);
    }
  }

  const budgetKeys = new Set(fyItems.map((i) => itemKey(i)));
  const rows: CategoryRow[] = [
    ...fyItems.map((i) => ({ category_group: i.category_group, category: i.category, budget: i.amount })),
    // 예산에 없는 항목으로 기록된 지출 (미분류 포함)
    ...[...spentByItem.entries()]
      .filter(([key]) => !budgetKeys.has(key))
      .map(([, v]) => ({ category_group: v.category_group, category: v.category, budget: 0 })),
  ].map(({ category_group, category, budget }) => {
    const key = itemKey({ category_group, category });
    const spent = spentByItem.get(key)?.amount ?? 0;
    return {
      key,
      category_group,
      category,
      budget,
      spent,
      remaining: budget - spent,
      ratio: budget > 0 ? spent / budget : null,
      status: statusOf(budget, spent, elapsedRatio),
    };
  });

  // 큰 카테고리별로 묶기 (예산안 순서 유지). 예산 큰 카테고리에 속하지 않는 지출은 "예산 외"로
  const budgetGroups = new Set(fyItems.map((i) => i.category_group));
  const groupMap = new Map<string, CategoryRow[]>();
  for (const r of rows) {
    const label = budgetGroups.has(r.category_group)
      ? r.category_group || NO_GROUP_LABEL
      : UNBUDGETED_GROUP_LABEL;
    if (!groupMap.has(label)) groupMap.set(label, []);
    groupMap.get(label)!.push(r);
  }
  const groups: GroupRow[] = [...groupMap.entries()].map(([group, items]) => {
    const budget = items.reduce((sum, r) => sum + r.budget, 0);
    const spent = items.reduce((sum, r) => sum + r.spent, 0);
    return {
      group,
      budget,
      spent,
      remaining: budget - spent,
      ratio: budget > 0 ? spent / budget : null,
      status: statusOf(budget, spent, elapsedRatio),
      items,
    };
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
    groups,
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
