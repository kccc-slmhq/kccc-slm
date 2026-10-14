import { loadBudgetData } from "@/lib/budget/data";
import BudgetUpload from "@/components/BudgetUpload";

export const revalidate = 0;

export default async function BudgetUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const { plans, items, months, error } = await loadBudgetData(null);

  return (
    <BudgetUpload
      initialTab={tab === "ledger" ? "ledger" : "budget"}
      plans={plans}
      items={items}
      months={months}
      error={error}
    />
  );
}
