"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { currentMonthKst, fiscalYearLabel, fiscalYearOf } from "@/lib/budget/fiscal";
import { won } from "@/lib/budget/summary";
import type { BudgetItem, BudgetPlan, ParsedBudget } from "@/lib/budget/types";
import { UNCATEGORIZED } from "@/lib/budget/types";
import { AmountInput, AnalyzeFile, Card } from "./shared";

type Row = { key: number; category: string; amount: number };

let nextKey = 1;
const toRows = (items: { category: string; amount: number }[]): Row[] =>
  items.map((i) => ({ key: nextKey++, category: i.category, amount: i.amount }));

export default function BudgetPlanForm({ plans, items }: { plans: BudgetPlan[]; items: BudgetItem[] }) {
  const router = useRouter();
  const current = fiscalYearOf(currentMonthKst());

  const [fiscalYear, setFiscalYear] = useState(current);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [documentTotal, setDocumentTotal] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing = plans.find((p) => p.fiscal_year === fiscalYear);
  const yearOptions = Array.from(
    new Set([current - 1, current, current + 1, fiscalYear, ...plans.map((p) => p.fiscal_year)])
  ).sort((a, b) => b - a);

  const total = (rows ?? []).reduce((s, r) => s + r.amount, 0);
  const names = (rows ?? []).map((r) => r.category.trim());
  const duplicate = names.find((n, i) => n && names.indexOf(n) !== i);
  const problems = [
    rows && rows.length === 0 && "항목이 하나 이상 있어야 합니다.",
    names.some((n) => !n) && "항목명이 비어 있는 행이 있습니다.",
    duplicate && `'${duplicate}' 항목이 중복되었습니다.`,
    names.includes(UNCATEGORIZED) && `'${UNCATEGORIZED}'는 예약된 이름이라 쓸 수 없습니다.`,
  ].filter(Boolean) as string[];

  function loadExisting() {
    setRows(
      toRows(
        items
          .filter((i) => i.fiscal_year === fiscalYear)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i) => ({ category: i.category, amount: i.amount }))
      )
    );
    setFilename(existing?.source_filename ?? null);
    setDocumentTotal(null);
  }

  async function confirm() {
    if (!rows || problems.length > 0) return;
    if (existing && !window.confirm(`${fiscalYearLabel(fiscalYear)} 예산안이 이미 있습니다. 새 내용으로 교체할까요?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await createClient().rpc("save_budget", {
      p_fiscal_year: fiscalYear,
      p_source_filename: filename,
      p_items: rows.map((r) => ({ category: r.category.trim(), amount: r.amount })),
    });
    setSaving(false);
    if (error) {
      setError(`저장에 실패했습니다: ${error.message}`);
      return;
    }
    router.push(`/?fy=${fiscalYear}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card title="1. 예산안 문서 분석">
        <AnalyzeFile
          label="예산안 파일 (PDF 또는 사진)"
          hint="AI가 지출 예산 항목과 금액을 뽑아냅니다. 결과는 아래에서 확인·수정한 뒤 확정해야 저장됩니다."
          extraFields={() => ({ kind: "budget" })}
          onParsed={(result, file) => {
            const parsed = result as ParsedBudget;
            setRows(toRows(parsed.items));
            setFilename(file.name);
            setDocumentTotal(parsed.document_total);
            if (parsed.fiscal_year) setFiscalYear(parsed.fiscal_year);
            setError(null);
          }}
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setRows(toRows([{ category: "", amount: 0 }]));
              setFilename(null);
              setDocumentTotal(null);
            }}
            className="text-gray-600 underline"
          >
            AI 없이 직접 입력
          </button>
          {existing && (
            <button type="button" onClick={loadExisting} className="text-gray-600 underline">
              확정된 {fiscalYear}년 회기 예산안 불러와서 수정
            </button>
          )}
        </div>
      </Card>

      {rows && (
        <Card title="2. 항목 확인 및 수정">
          <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <span className="text-gray-600 whitespace-nowrap">회기</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {fiscalYearLabel(y)}
                  {plans.some((p) => p.fiscal_year === y) ? " · 확정됨" : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-2 py-1.5">항목명</th>
                  <th className="text-right px-2 py-1.5 w-40">예산 금액(원)</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="border-b border-gray-100">
                    <td className="px-2 py-1.5">
                      <input
                        value={r.category}
                        aria-label={`${i + 1}번째 항목명`}
                        onChange={(e) =>
                          setRows(rows.map((x) => (x.key === r.key ? { ...x, category: e.target.value } : x)))
                        }
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <AmountInput
                        value={r.amount}
                        ariaLabel={`${i + 1}번째 항목 금액`}
                        onChange={(n) => setRows(rows.map((x) => (x.key === r.key ? { ...x, amount: n } : x)))}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                        className="text-gray-400 hover:text-red-600 text-xs"
                        aria-label={`${i + 1}번째 항목 삭제`}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setRows([...rows, ...toRows([{ category: "", amount: 0 }])])}
                      className="text-sm font-semibold text-brand-600"
                    >
                      + 항목 추가
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">합계 {won(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {documentTotal !== null && documentTotal !== total && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              ⚠ 문서에 적힌 총액({won(documentTotal)})과 항목 합계({won(total)})가 다릅니다. 항목을 확인해주세요.
              (총 예산은 항목 합계로 저장됩니다)
            </p>
          )}
          {existing && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              이 회기 예산안이 이미 확정되어 있습니다. 확정하면 새 내용으로 교체됩니다. 항목명을 바꾸면 이미 확정된
              월별 장부의 해당 항목은 &apos;예산 외&apos;로 표시되니 주의하세요.
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
            className="w-full sm:w-auto rounded-xl bg-brand-600 hover:bg-brand-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "저장 중..." : `${fiscalYear}년 회기 예산안 확정`}
          </button>
        </Card>
      )}
    </div>
  );
}
