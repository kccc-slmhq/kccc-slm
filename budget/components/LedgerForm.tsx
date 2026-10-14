"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { currentMonthKst, fiscalYearLabel, fiscalYearOf, monthLabel, monthToDate } from "@/lib/budget/fiscal";
import { won } from "@/lib/budget/summary";
import type { BudgetItem, BudgetPlan, LedgerMonth, ParsedLedger } from "@/lib/budget/types";
import { UNCATEGORIZED } from "@/lib/budget/types";
import { AmountInput, AnalyzeFile, Card } from "./shared";

type Row = { key: number; entry_date: string; description: string; category: string; amount: number };

let nextKey = 1;

function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export default function LedgerForm({
  plans,
  items,
  months,
}: {
  plans: BudgetPlan[];
  items: BudgetItem[];
  months: LedgerMonth[];
}) {
  const router = useRouter();
  const [month, setMonth] = useState(previousMonth(currentMonthKst()));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [detectedMonth, setDetectedMonth] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fiscalYear = month ? fiscalYearOf(month) : null;
  const hasPlan = plans.some((p) => p.fiscal_year === fiscalYear);
  const categories = useMemo(
    () =>
      items
        .filter((i) => i.fiscal_year === fiscalYear)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => i.category),
    [items, fiscalYear]
  );
  const options = [...categories, UNCATEGORIZED];
  const alreadyConfirmed = months.some((m) => m.month.slice(0, 7) === month);

  const total = (rows ?? []).reduce((s, r) => s + r.amount, 0);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows ?? []) map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
    return options.filter((c) => map.has(c)).map((c) => ({ category: c, amount: map.get(c)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, categories]);

  const problems = [
    !month && "대상 월을 선택해주세요.",
    rows && rows.some((r) => r.amount <= 0) && "금액이 0원인 행이 있습니다. 금액을 넣거나 행을 삭제해주세요.",
    rows && rows.some((r) => !options.includes(r.category)) && "예산에 없는 항목이 선택된 행이 있습니다.",
    rows && rows.some((r) => r.entry_date && !r.entry_date.startsWith(month)) && "대상 월과 다른 날짜의 행이 있습니다.",
  ].filter(Boolean) as string[];

  async function confirm() {
    if (!rows || problems.length > 0) return;
    if (alreadyConfirmed && !window.confirm(`${monthLabel(month)} 장부가 이미 확정되어 있습니다. 새 내용으로 교체할까요?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await createClient().rpc("save_ledger_month", {
      p_month: monthToDate(month),
      p_source_filename: filename,
      p_entries: rows.map((r) => ({
        entry_date: r.entry_date || null,
        description: r.description.trim(),
        category: r.category,
        amount: r.amount,
      })),
    });
    setSaving(false);
    if (error) {
      setError(`저장에 실패했습니다: ${error.message}`);
      return;
    }
    router.push(`/?fy=${fiscalYear}`);
    router.refresh();
  }

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) => (prev ?? []).map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-4">
      <Card title="1. 월별 장부 분석">
        <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
          <span className="text-slate-600 whitespace-nowrap">대상 월</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
          />
          {fiscalYear !== null && <span className="text-xs text-slate-500">{fiscalYearLabel(fiscalYear)}</span>}
        </label>

        {!hasPlan ? (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            {fiscalYear !== null && fiscalYearLabel(fiscalYear)} 예산안이 아직 확정되지 않았습니다. 지출을 예산 항목으로
            분류하려면{" "}
            <Link href="/upload" className="underline font-medium">
              예산안
            </Link>
            을 먼저 확정해주세요.
          </p>
        ) : (
          <>
            <AnalyzeFile
              label="장부 파일 (PDF 또는 사진)"
              hint={`AI가 지출 내역을 한 건씩 뽑아 예산 항목(${categories.join(", ")})으로 분류합니다. 수입·잔액은 제외됩니다.`}
              extraFields={() => ({ kind: "ledger", categories: JSON.stringify(categories) })}
              onParsed={(result, file) => {
                const parsed = result as ParsedLedger;
                setRows(
                  parsed.items.map((i) => ({
                    key: nextKey++,
                    entry_date: i.entry_date ?? "",
                    description: i.description,
                    category: i.category,
                    amount: i.amount,
                  }))
                );
                setFilename(file.name);
                setError(null);
                setDetectedMonth(parsed.month);
              }}
            />
            <button
              type="button"
              onClick={() => {
                setRows([{ key: nextKey++, entry_date: "", description: "", category: options[0], amount: 0 }]);
                setFilename(null);
                setDetectedMonth(null);
              }}
              className="text-sm text-slate-600 underline"
            >
              AI 없이 직접 입력
            </button>
          </>
        )}
      </Card>

      {rows && hasPlan && (
        <Card title={`2. ${monthLabel(month)} 지출 항목 확인 및 수정`}>
          {detectedMonth && detectedMonth !== month && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              <span>
                ⚠ 문서에서 {monthLabel(detectedMonth)} 장부로 인식했습니다. 대상 월({monthLabel(month)})이 맞는지
                확인해주세요.
              </span>
              <button
                type="button"
                onClick={() => setMonth(detectedMonth)}
                className="rounded-md bg-white px-2 py-1 text-xs font-medium ring-1 ring-amber-300"
              >
                {monthLabel(detectedMonth)}로 변경
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-left px-2 py-1.5 w-36">날짜</th>
                  <th className="text-left px-2 py-1.5">내용</th>
                  <th className="text-left px-2 py-1.5 w-36">예산 항목</th>
                  <th className="text-right px-2 py-1.5 w-36">금액(원)</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.key}
                    className={`border-b border-slate-100 ${r.category === UNCATEGORIZED ? "bg-orange-50/60" : ""}`}
                  >
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={r.entry_date}
                        aria-label={`${i + 1}번째 날짜`}
                        onChange={(e) => updateRow(r.key, { entry_date: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={r.description}
                        aria-label={`${i + 1}번째 내용`}
                        onChange={(e) => updateRow(r.key, { description: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={r.category}
                        aria-label={`${i + 1}번째 예산 항목`}
                        onChange={(e) => updateRow(r.key, { category: e.target.value })}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      >
                        {!options.includes(r.category) && <option value={r.category}>{r.category}</option>}
                        {options.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <AmountInput
                        value={r.amount}
                        ariaLabel={`${i + 1}번째 금액`}
                        onChange={(n) => updateRow(r.key, { amount: n })}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                        className="text-slate-400 hover:text-red-600 text-xs"
                        aria-label={`${i + 1}번째 행 삭제`}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                      지출 내역이 없습니다. 지출이 없는 달이면 그대로 확정해도 됩니다.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-2 py-2" colSpan={3}>
                    <button
                      type="button"
                      onClick={() =>
                        setRows([
                          ...rows,
                          { key: nextKey++, entry_date: "", description: "", category: options[0], amount: 0 },
                        ])
                      }
                      className="text-sm text-blue-700"
                    >
                      + 행 추가
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">합계 {won(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {byCategory.length > 0 && (
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs font-medium text-slate-500 mb-1">항목별 합계</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {byCategory.map((c) => (
                  <span key={c.category} className={c.category === UNCATEGORIZED ? "text-orange-800" : "text-slate-700"}>
                    {c.category} <span className="tabular-nums font-medium">{won(c.amount)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {alreadyConfirmed && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              {monthLabel(month)} 장부가 이미 확정되어 있습니다. 확정하면 새 내용으로 교체됩니다.
            </p>
          )}
          {problems.map((p) => (
            <p key={p} className="text-sm text-red-600">
              {p}
            </p>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={confirm}
            disabled={saving || problems.length > 0}
            className="w-full sm:w-auto rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "저장 중..." : `${monthLabel(month)} 장부 확정`}
          </button>
        </Card>
      )}
    </div>
  );
}
