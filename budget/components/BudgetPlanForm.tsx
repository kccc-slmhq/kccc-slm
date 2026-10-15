"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUDGET_EDIT_CLOSED, budgetEditDeadline, canEditBudget, currentMonthKst, fiscalYearLabel, fiscalYearOf } from "@/lib/budget/fiscal";
import { won } from "@/lib/budget/summary";
import type { BudgetItem, BudgetPlan, ParsedBudget } from "@/lib/budget/types";
import { KIND_LABEL, UNCATEGORIZED, itemKey, itemLabel, kindOf, type Kind } from "@/lib/budget/types";
import { AmountInput, AnalyzeFile, Card } from "./shared";
import { passwordHeader, usePassword } from "./EditLock";

type Row = { key: number; kind: Kind; category_group: string; category: string; amount: number; one_time: boolean };

let nextKey = 1;
const toRows = (
  items: { kind?: Kind; category_group: string; category: string; amount: number; one_time?: boolean }[]
): Row[] =>
  items.map((i) => ({
    key: nextKey++,
    kind: kindOf(i),
    category_group: i.category_group,
    category: i.category,
    amount: i.amount,
    one_time: !!i.one_time,
  }));

const KINDS: Kind[] = ["expense", "income"];

// 행들을 큰 카테고리별로 묶음 (처음 나온 순서 유지)
function groupRows(rows: Row[], kind: Kind): { group: string; rows: Row[] }[] {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.kind !== kind) continue;
    if (!map.has(r.category_group)) map.set(r.category_group, []);
    map.get(r.category_group)!.push(r);
  }
  return [...map.entries()].map(([group, rows]) => ({ group, rows }));
}

function existingRows(items: BudgetItem[], fiscalYear: number): Row[] {
  return toRows(
    items
      .filter((i) => i.fiscal_year === fiscalYear)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({
        kind: i.kind,
        category_group: i.category_group,
        category: i.category,
        amount: i.amount,
        one_time: i.one_time,
      }))
  );
}

export default function BudgetPlanForm({
  plans,
  items,
  editFiscalYear,
  password,
}: {
  plans: BudgetPlan[];
  items: BudgetItem[];
  editFiscalYear: number | null; // 예산안 화면의 '예산안 수정'으로 들어오면 그 회기를 바로 불러옴
  password: string; // 업로드 화면에 들어올 때 확인한 재정 담당자 비밀번호
}) {
  const router = useRouter();
  const current = fiscalYearOf(currentMonthKst());
  const editing = editFiscalYear !== null && plans.some((p) => p.fiscal_year === editFiscalYear);

  const [fiscalYear, setFiscalYear] = useState(editFiscalYear ?? current);
  const [rows, setRows] = useState<Row[] | null>(() => (editing ? existingRows(items, editFiscalYear!) : null));
  const [filename, setFilename] = useState<string | null>(
    () => (editing ? plans.find((p) => p.fiscal_year === editFiscalYear)?.source_filename ?? null : null)
  );
  const [deleting, setDeleting] = useState(false);
  // 문서에 적힌 총액 (지출/수입) — 항목 합계와 다르면 경고
  const [documentTotals, setDocumentTotals] = useState<Record<Kind, number | null>>({ expense: null, income: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 업로드 화면에 들어올 때 입력한 비밀번호로 첫 작업(분석·입력 → 확정)을 이어서 함. 확정 후 다음 작업은 다시 물어봄
  const lock = usePassword(password);

  const existing = plans.find((p) => p.fiscal_year === fiscalYear);
  // 이미 확정된 예산안은 수정 가능 기간(회기 시작 후 1달)이 지나면 고칠 수 없음 → 용도변경으로
  const closed = !!existing && !canEditBudget(fiscalYear);
  const yearOptions = Array.from(
    new Set([current - 1, current, current + 1, fiscalYear, ...plans.map((p) => p.fiscal_year)])
  ).sort((a, b) => b - a);

  const totalOf = (kind: Kind) => (rows ?? []).filter((r) => r.kind === kind).reduce((s, r) => s + r.amount, 0);
  const trimmed = (rows ?? []).map((r) => ({
    kind: r.kind,
    category_group: r.category_group.trim(),
    category: r.category.trim(),
  }));
  const keys = trimmed.map(itemKey);
  const duplicateIndex = keys.findIndex((k, i) => trimmed[i].category && keys.indexOf(k) !== i);
  const problems = [
    rows && rows.length === 0 && "항목이 하나 이상 있어야 합니다.",
    trimmed.some((r) => !r.category) && "항목명이 비어 있는 행이 있습니다.",
    duplicateIndex >= 0 && `'${itemLabel(trimmed[duplicateIndex])}' 항목이 중복되었습니다.`,
    trimmed.some((r) => r.category === UNCATEGORIZED) && `'${UNCATEGORIZED}'는 예약된 이름이라 쓸 수 없습니다.`,
  ].filter(Boolean) as string[];

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) => (prev ?? []).map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const renameGroup = (kind: Kind, from: string, to: string) =>
    setRows((prev) =>
      (prev ?? []).map((x) => (x.kind === kind && x.category_group === from ? { ...x, category_group: to } : x))
    );
  const addItemToGroup = (kind: Kind, group: string) =>
    setRows((prev) => {
      const list = prev ?? [];
      const last = list.findLastIndex((x) => x.kind === kind && x.category_group === group);
      const row = toRows([{ kind, category_group: group, category: "", amount: 0 }])[0];
      return [...list.slice(0, last + 1), row, ...list.slice(last + 1)];
    });
  const addGroup = (kind: Kind) =>
    setRows((prev) => {
      const list = prev ?? [];
      let n = 1;
      while (list.some((x) => x.kind === kind && x.category_group === `새 카테고리 ${n}`)) n++;
      return [...list, ...toRows([{ kind, category_group: `새 카테고리 ${n}`, category: "", amount: 0 }])];
    });

  function loadExisting() {
    setRows(existingRows(items, fiscalYear));
    setFilename(existing?.source_filename ?? null);
    setDocumentTotals({ expense: null, income: null });
  }

  async function deletePlan(password: string) {
    lock.forget();
    if (
      !window.confirm(
        `${fiscalYearLabel(fiscalYear)} 예산안을 삭제할까요?\n확정된 월별 장부는 남아 있지만, 예산이 없어 대시보드에 표시되지 않습니다.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/budget?fiscal_year=${fiscalYear}`, {
      method: "DELETE",
      headers: passwordHeader(password),
    }).catch(() => null);
    setDeleting(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.error ?? "삭제에 실패했습니다.");
      return;
    }
    setRows(null);
    router.push("/upload");
    router.refresh();
  }

  // 확정은 이번 작업에서 입력한 비밀번호로 진행 (없으면 물어봄)
  function confirm() {
    if (!rows || problems.length > 0) return;
    if (existing && !window.confirm(`${fiscalYearLabel(fiscalYear)} 예산안이 이미 있습니다. 새 내용으로 교체할까요?`)) {
      return;
    }
    lock.ask((password) => void save(password), { continueFlow: true });
  }

  async function save(password: string) {
    if (!rows) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...passwordHeader(password) },
      body: JSON.stringify({
        fiscal_year: fiscalYear,
        source_filename: filename,
        items: rows.map((r) => ({
          kind: r.kind,
          category_group: r.category_group.trim(),
          category: r.category.trim(),
          amount: r.amount,
          one_time: r.kind === "expense" && r.one_time,
        })),
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => ({}));
      if (res?.status === 403) lock.forget();
      setError(body?.error ?? "저장에 실패했습니다.");
      return;
    }
    lock.forget();
    router.push(`/?fy=${fiscalYear}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {lock.dialog}
      <Card title="1. 예산안 문서 분석">
        <AnalyzeFile
          label="예산안 파일 (PDF 또는 사진)"
          hint="AI가 지출·수입 예산의 큰 카테고리와 세부 항목, 금액을 뽑아냅니다. 결과는 아래에서 확인·수정한 뒤 확정해야 저장됩니다."
          extraFields={() => ({ kind: "budget" })}
          authorize={(run) => lock.ask(run, { continueFlow: true })}
          onParsed={(result, file) => {
            const parsed = result as ParsedBudget;
            setRows(toRows(parsed.items));
            setFilename(file.name);
            setDocumentTotals({ expense: parsed.document_total, income: parsed.document_income_total });
            if (parsed.fiscal_year) setFiscalYear(parsed.fiscal_year);
            setError(null);
          }}
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() =>
              lock.ask(
                () => {
                  setRows(toRows([{ kind: "expense", category_group: "", category: "", amount: 0 }]));
                  setFilename(null);
                  setDocumentTotals({ expense: null, income: null });
                },
                { continueFlow: true }
              )
            }
            className="text-gray-600 underline"
          >
            AI 없이 직접 입력
          </button>
          {existing && !closed && (
            <button type="button" onClick={() => lock.ask(loadExisting, { continueFlow: true })} className="text-gray-600 underline">
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

          {KINDS.map((kind) => (
            <section key={kind} className="space-y-3">
              <h3 className="flex items-center gap-2 px-1 pt-2 text-[15px] font-bold text-gray-900">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    kind === "income" ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"
                  }`}
                >
                  {KIND_LABEL[kind]}
                </span>
                {KIND_LABEL[kind]} 예산
                {kind === "expense" && (
                  <span className="ml-auto text-xs font-normal text-gray-500">
                    일회성 = 한 번 열리고 끝나는 행사 (속도 경고 없이 초과만 알림)
                  </span>
                )}
              </h3>
          <div className="space-y-3">
            {groupRows(rows, kind).map(({ group, rows: groupItems }) => {
              const subtotal = groupItems.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div key={`${kind}:${group}`} className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-2 bg-brand-50/60 px-3 py-2">
                    <input
                      value={group}
                      placeholder="카테고리 없음"
                      aria-label="큰 카테고리 이름"
                      onChange={(e) => renameGroup(kind, group, e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[15px] font-bold text-gray-900 hover:border-brand-100 focus:border-brand-500 focus:bg-white outline-none"
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap">{groupItems.length}개 항목</span>
                    <span className="text-sm font-semibold tabular-nums whitespace-nowrap text-gray-900">
                      소계 {won(subtotal)}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {groupItems.map((r) => (
                        <tr key={r.key} className="border-t border-gray-100">
                          <td className="pl-3 pr-2 py-1.5">
                            <input
                              value={r.category}
                              aria-label={`${group} 항목명`}
                              onChange={(e) => updateRow(r.key, { category: e.target.value })}
                              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                            />
                          </td>
                          {kind === "expense" && (
                            <td className="px-1 py-1.5 w-24 whitespace-nowrap">
                              <label
                                className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-600"
                                title="한 번 열리고 끝나는 행사 예산이면 체크하세요. 지출 속도로 '빠름' 경고를 하지 않고, 예산 초과만 알려줍니다."
                              >
                                <input
                                  type="checkbox"
                                  checked={r.one_time}
                                  onChange={(e) => updateRow(r.key, { one_time: e.target.checked })}
                                  className="h-4 w-4 accent-brand-600"
                                />
                                일회성
                              </label>
                            </td>
                          )}
                          <td className="px-2 py-1.5 w-36 sm:w-44">
                            <AmountInput
                              value={r.amount}
                              ariaLabel={`${r.category || "항목"} 금액`}
                              onChange={(n) => updateRow(r.key, { amount: n })}
                            />
                          </td>
                          <td className="pr-3 py-1.5 w-12 text-center">
                            <button
                              type="button"
                              onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                              className="text-gray-400 hover:text-red-600 text-xs"
                              aria-label={`${r.category || "항목"} 삭제`}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-gray-100 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => addItemToGroup(kind, group)}
                      className="text-sm font-semibold text-brand-600"
                    >
                      + 이 카테고리에 항목 추가
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-1">
            <button type="button" onClick={() => addGroup(kind)} className="text-sm font-semibold text-brand-600">
              + {KIND_LABEL[kind]} 카테고리 추가
            </button>
            <span className="font-bold tabular-nums text-gray-900">
              {KIND_LABEL[kind]} 합계 {won(totalOf(kind))}
            </span>
          </div>

          {documentTotals[kind] !== null && documentTotals[kind] !== totalOf(kind) && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              ⚠ 문서에 적힌 {KIND_LABEL[kind]} 총액({won(documentTotals[kind]!)})과 항목 합계({won(totalOf(kind))})가
              다릅니다. 항목을 확인해주세요. (예산은 항목 합계로 저장됩니다)
            </p>
          )}
            </section>
          ))}

          {closed && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              {fiscalYearLabel(fiscalYear)} {BUDGET_EDIT_CLOSED} (수정 가능 기간: {budgetEditDeadline(fiscalYear)}까지 · 예산안
              화면의 &apos;용도변경&apos;에서 할 수 있습니다)
            </p>
          )}
          {existing && !closed && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              이 회기 예산안이 이미 확정되어 있습니다. 확정하면 새 내용으로 교체됩니다. 카테고리나 항목명을 바꾸면 이미
              확정된 월별 장부의 해당 항목은 &apos;예산 외&apos;로 표시되니 주의하세요.
            </p>
          )}
          {problems.map((p) => (
            <p key={p} className="text-sm text-red-600">
              {p}
            </p>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={saving || deleting || closed || problems.length > 0}
              className="w-full sm:w-auto rounded-xl bg-brand-600 hover:bg-brand-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "저장 중..." : `${fiscalYear}년 회기 예산안 확정`}
            </button>
            {existing && !closed && (
              <button
                type="button"
                onClick={() => lock.ask((pw) => void deletePlan(pw))}
                disabled={saving || deleting}
                className="w-full sm:w-auto rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "확정된 예산안 삭제"}
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
