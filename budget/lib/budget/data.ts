import { createClient } from "@/lib/supabase/server";
import type { BudgetItem, BudgetPlan, LedgerEntry, LedgerMonth } from "./types";

export type BudgetData = {
  plans: BudgetPlan[];
  items: BudgetItem[];
  months: LedgerMonth[];
  entries: LedgerEntry[]; // entriesFiscalYear 회기로 확정된 장부의 지출 내역만
  error?: string;
};

const PAGE = 1000; // Supabase 기본 최대 조회 행 수

// 예산 항목/월 목록은 작아서 전부, 지출 내역은 요청한 회기만 가져옵니다.
export async function loadBudgetData(entriesFiscalYear: number | null): Promise<BudgetData> {
  const supabase = await createClient();
  const [plans, items, months] = await Promise.all([
    supabase.from("budget_plans").select("*").order("fiscal_year", { ascending: false }),
    supabase.from("budget_items").select("*").order("fiscal_year").order("sort_order"),
    supabase.from("ledger_months").select("*").order("month"),
  ]);

  let error = plans.error ?? items.error ?? months.error;
  const entries: LedgerEntry[] = [];

  // 회기 시작 전에 미리 쓴 달(예: 7월)도 그 회기로 지정될 수 있어서, 날짜 범위가 아니라 장부의 회기로 고름
  const fyMonths =
    entriesFiscalYear === null
      ? []
      : ((months.data ?? []) as LedgerMonth[]).filter((m) => m.fiscal_year === entriesFiscalYear).map((m) => m.month);

  if (fyMonths.length > 0 && !error) {
    for (let from = 0; ; from += PAGE) {
      const { data, error: entriesError } = await supabase
        .from("ledger_entries")
        .select("*")
        .in("month", fyMonths)
        .order("month")
        .order("sort_order")
        .order("id")
        .range(from, from + PAGE - 1);
      if (entriesError) {
        error = entriesError;
        break;
      }
      entries.push(...((data ?? []) as LedgerEntry[]));
      if (!data || data.length < PAGE) break;
    }
  }

  return {
    plans: (plans.data ?? []) as BudgetPlan[],
    items: (items.data ?? []) as BudgetItem[],
    months: (months.data ?? []) as LedgerMonth[],
    entries,
    error: error?.message,
  };
}

// 한 달치 확정된 지출 내역 (장부 수정 화면용)
export async function loadLedgerMonthEntries(month: string): Promise<LedgerEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("month", `${month}-01`)
    .order("sort_order")
    .order("id");
  return (data ?? []) as LedgerEntry[];
}
