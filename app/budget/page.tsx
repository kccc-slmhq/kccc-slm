import { loadBudgetData } from "@/lib/budget/data";
import { currentMonthKst, fiscalYearOf } from "@/lib/budget/fiscal";
import BudgetDashboard from "@/components/budget/BudgetDashboard";

export const revalidate = 0;

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { fy } = await searchParams;
  const requested = Number(Array.isArray(fy) ? fy[0] : fy);
  const current = fiscalYearOf(currentMonthKst());

  let fiscalYear = Number.isInteger(requested) && requested > 2000 ? requested : current;
  let data = await loadBudgetData(fiscalYear);

  // ?fy 없이 들어왔는데 이번 회기 예산안이 아직 없으면, 가장 최근 회기를 보여줌
  if (!fy && data.plans.length > 0 && !data.plans.some((p) => p.fiscal_year === fiscalYear)) {
    fiscalYear = data.plans[0].fiscal_year;
    data = await loadBudgetData(fiscalYear);
  }

  return <BudgetDashboard fiscalYear={fiscalYear} {...data} />;
}
