import { loadBudgetData, loadLedgerMonthEntries } from "@/lib/budget/data";
import BudgetUpload from "@/components/BudgetUpload";

export const revalidate = 0;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// ?tab=ledger&month=YYYY-MM  → 그 달 확정된 장부를 불러와서 수정
// ?tab=budget&edit=2026      → 그 회기 확정된 예산안을 불러와서 수정
export default async function BudgetUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const month = one(sp.month);
  const edit = Number(one(sp.edit));
  const editMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : null;
  const { plans, items, months, error } = await loadBudgetData(null);
  const editEntries =
    editMonth && months.some((m) => m.month.startsWith(editMonth)) ? await loadLedgerMonthEntries(editMonth) : null;

  return (
    <BudgetUpload
      initialTab={one(sp.tab) === "ledger" ? "ledger" : "budget"}
      editMonth={editMonth}
      editEntries={editEntries}
      editFiscalYear={Number.isInteger(edit) && edit > 2000 ? edit : null}
      plans={plans}
      items={items}
      months={months}
      error={error}
    />
  );
}
