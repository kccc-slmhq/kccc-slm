import { loadBudgetData } from "@/lib/budget/data";
import { currentMonthKst, fiscalYearOf } from "@/lib/budget/fiscal";
import { createClient } from "@/lib/supabase/server";
import type { BudgetTransfer } from "@/lib/budget/types";
import BudgetPlanView from "@/components/BudgetPlanView";

export const revalidate = 0;

// 확정된 예산안 보기 + 용도변경 내역. ?fy=2026
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { fy } = await searchParams;
  const requested = Number(Array.isArray(fy) ? fy[0] : fy);
  const { plans, items, error } = await loadBudgetData(null);
  const current = fiscalYearOf(currentMonthKst());
  const fiscalYear =
    Number.isInteger(requested) && plans.some((p) => p.fiscal_year === requested)
      ? requested
      : (plans.find((p) => p.fiscal_year === current) ?? plans[0])?.fiscal_year ?? current;

  // 용도변경 표가 아직 없으면(SQL 실행 전) 내역 없이 보여줌
  const supabase = await createClient();
  const { data: transfers, error: transferError } = await supabase
    .from("budget_transfers")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("created_at", { ascending: false });

  return (
    <BudgetPlanView
      fiscalYear={fiscalYear}
      plans={plans}
      items={items}
      transfers={(transfers ?? []) as BudgetTransfer[]}
      transfersReady={!transferError}
      error={error}
    />
  );
}
