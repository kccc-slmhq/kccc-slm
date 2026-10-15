import { loadBudgetData } from "@/lib/budget/data";
import { currentMonthKst, fiscalYearOf } from "@/lib/budget/fiscal";
import BudgetPlanView from "@/components/BudgetPlanView";

export const revalidate = 0;

// 확정된 예산안 보기 (읽기 전용). ?fy=2026
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

  return <BudgetPlanView fiscalYear={fiscalYear} plans={plans} items={items} error={error} />;
}
