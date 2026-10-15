"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { currentMonthKst, fiscalYearLabel, fiscalYearOf, monthLabel, monthToDate } from "@/lib/budget/fiscal";
import { won } from "@/lib/budget/summary";
import type { BudgetItem, BudgetPlan, ItemRef, LedgerEntry, LedgerMonth, ParsedLedger } from "@/lib/budget/types";
import { KIND_LABEL, UNCATEGORIZED, isCarryoverItem, itemKey, kindOf, uncategorizedRef, type Kind } from "@/lib/budget/types";
import { AmountInput, AnalyzeFile, Card } from "./shared";
import { EDIT_NOTICE, passwordHeader, usePassword } from "./EditLock";

type Row = {
  key: number;
  entry_date: string;
  description: string;
  kind: Kind;
  category_group: string;
  category: string;
  amount: number;
};

let nextKey = 1;

function toRows(entries: LedgerEntry[]): Row[] {
  return entries.map((e) => ({
    key: nextKey++,
    entry_date: e.entry_date ?? "",
    description: e.description ?? "",
    kind: kindOf(e),
    category_group: e.category_group ?? "",
    category: e.category,
    amount: e.amount,
  }));
}

function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export default function LedgerForm({
  plans,
  items,
  months,
  editMonth,
  editEntries,
}: {
  plans: BudgetPlan[];
  items: BudgetItem[];
  months: LedgerMonth[];
  editMonth: string | null; // 대시보드의 '수정'으로 들어오면 그 달 확정된 장부를 바로 불러옴
  editEntries: LedgerEntry[] | null; // editMonth 의 확정된 지출 내역 (서버에서 미리 읽음)
}) {
  const router = useRouter();
  const [month, setMonthState] = useState(editMonth ?? previousMonth(currentMonthKst()));
  const [rows, setRows] = useState<Row[] | null>(() => (editEntries ? toRows(editEntries) : null));
  const [filename, setFilename] = useState<string | null>(
    () => months.find((m) => m.month.slice(0, 7) === editMonth)?.source_filename ?? null
  );
  const [detectedMonth, setDetectedMonth] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 반영할 회기를 직접 고른 경우 (회기 시작 전에 다음 회기 예산을 미리 쓴 달)
  const [fiscalChoice, setFiscalChoice] = useState<number | null>(null);

  const existingMonth = months.find((m) => m.month.slice(0, 7) === month);
  const naturalFiscalYear = month ? fiscalYearOf(month) : null;
  const fiscalYear = fiscalChoice ?? existingMonth?.fiscal_year ?? naturalFiscalYear;
  // 6·7월은 다음 회기(8월 시작) 예산을 미리 쓴 경우가 있어 다음 회기로도 반영할 수 있게 함
  const canPrespend = naturalFiscalYear !== null && ["06", "07"].includes(month.slice(5, 7));
  const hasPlan = plans.some((p) => p.fiscal_year === fiscalYear);

  function setMonth(next: string) {
    setMonthState(next);
    setFiscalChoice(null);
  }

  async function loadConfirmed(target: string) {
    setBusy(true);
    setError(null);
    const { data, error } = await createClient()
      .from("ledger_entries")
      .select("*")
      .eq("month", monthToDate(target))
      .order("sort_order")
      .order("id");
    setBusy(false);
    if (error) {
      setError(`장부를 불러오지 못했습니다: ${error.message}`);
      return;
    }
    setRows(toRows((data ?? []) as LedgerEntry[]));
    setFilename(months.find((m) => m.month.slice(0, 7) === target)?.source_filename ?? null);
    setDetectedMonth(null);
  }

  // 대시보드의 '수정'에서 입력한 비밀번호는 이 달 확정까지 이어서 씀
  const lock = usePassword(editMonth ? `ledger:${editMonth}` : null);

  async function deleteMonth(password: string) {
    lock.forget();
    if (!window.confirm(`${monthLabel(month)} 장부를 삭제할까요? 이 달의 내역이 모두 지워집니다.`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/ledger?month=${month}`, {
      method: "DELETE",
      headers: passwordHeader(password),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.error ?? "삭제에 실패했습니다.");
      return;
    }
    setRows(null);
    router.refresh();
  }
  // 이 회기 예산 항목 (큰 카테고리 › 세부 항목)
  const budgetRefs: ItemRef[] = items
    .filter((i) => i.fiscal_year === fiscalYear)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ kind: kindOf(i), category_group: i.category_group, category: i.category }));
  // 지출/수입별 선택지 (큰 카테고리로 묶음)
  const optionGroupsOf = (kind: Kind) => {
    const map = new Map<string, ItemRef[]>();
    for (const r of budgetRefs) {
      if (r.kind !== kind) continue;
      if (!map.has(r.category_group)) map.set(r.category_group, []);
      map.get(r.category_group)!.push(r);
    }
    return [...map.entries()];
  };
  const allRefs = [...budgetRefs, uncategorizedRef("expense"), uncategorizedRef("income")];
  const validKeys = new Set(allRefs.map(itemKey));
  const firstRefOf = (kind: Kind): ItemRef => budgetRefs.find((r) => r.kind === kind) ?? uncategorizedRef(kind);
  const newRow = (kind: Kind): Row => {
    const ref = firstRefOf(kind);
    return {
      key: nextKey++,
      entry_date: "",
      description: "",
      kind,
      category_group: ref.category_group,
      category: ref.category,
      amount: 0,
    };
  };
  const alreadyConfirmed = months.some((m) => m.month.slice(0, 7) === month);

  const totalOf = (kind: Kind) => (rows ?? []).filter((r) => r.kind === kind).reduce((s, r) => s + r.amount, 0);
  // 지출/수입 × 큰 카테고리별 합계 (미분류는 따로)
  const byGroup = useMemo(() => {
    const map = new Map<string, { kind: Kind; group: string; amount: number }>();
    for (const r of rows ?? []) {
      const group = r.category === UNCATEGORIZED && !r.category_group ? UNCATEGORIZED : r.category_group || "기타";
      const key = `${r.kind}:${group}`;
      const cur = map.get(key) ?? { kind: r.kind, group, amount: 0 };
      cur.amount += r.amount;
      map.set(key, cur);
    }
    return [...map.values()];
  }, [rows]);

  const problems = [
    !month && "대상 월을 선택해주세요.",
    rows && rows.some((r) => r.amount <= 0) && "금액이 0원인 행이 있습니다. 금액을 넣거나 행을 삭제해주세요.",
    rows && rows.some((r) => !validKeys.has(itemKey(r))) && "예산에 없는 항목이 선택된 행이 있습니다.",
    rows && rows.some((r) => r.entry_date && !r.entry_date.startsWith(month)) && "대상 월과 다른 날짜의 행이 있습니다.",
  ].filter(Boolean) as string[];

  // 확정은 이번 작업에서 입력한 비밀번호로 진행 (없으면 물어봄)
  function confirm() {
    if (!rows || problems.length > 0) return;
    if (alreadyConfirmed && !window.confirm(`${monthLabel(month)} 장부가 이미 확정되어 있습니다. 새 내용으로 교체할까요?`)) {
      return;
    }
    lock.ask((password) => void save(password), { continueFlow: true });
  }

  async function save(password: string) {
    if (!rows) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...passwordHeader(password) },
      body: JSON.stringify({
        month,
        fiscal_year: fiscalYear,
        source_filename: filename,
        entries: rows.map((r) => ({
          entry_date: r.entry_date || null,
          description: r.description.trim(),
          kind: r.kind,
          category_group: r.category_group,
          category: r.category,
          amount: r.amount,
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

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) => (prev ?? []).map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-6">
      {lock.dialog}
      <Card title="1. 월별 장부 분석">
        <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
          <span className="text-gray-600 whitespace-nowrap">대상 월</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm"
          />
          {fiscalYear !== null && !canPrespend && (
            <span className="text-xs text-gray-500">{fiscalYearLabel(fiscalYear)}</span>
          )}
        </label>

        {canPrespend && naturalFiscalYear !== null && fiscalYear !== null && (
          <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <span className="text-gray-600 whitespace-nowrap">반영할 회기</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalChoice(Number(e.target.value))}
              className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm"
            >
              <option value={naturalFiscalYear}>{fiscalYearLabel(naturalFiscalYear)}</option>
              <option value={naturalFiscalYear + 1}>
                {fiscalYearLabel(naturalFiscalYear + 1)} · 회기 시작 전 미리 쓴 지출
              </option>
            </select>
          </label>
        )}

        {existingMonth && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50/60 px-3 py-2 text-sm">
            <span className="text-gray-700">
              {monthLabel(month)} 장부는 이미 확정되어 있습니다 ({fiscalYearLabel(existingMonth.fiscal_year)}).
            </span>
            <span className="w-full text-xs text-gray-500">🔒 {EDIT_NOTICE}</span>
            <button
              type="button"
              onClick={() => lock.ask(() => void loadConfirmed(month))}
              disabled={busy}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-brand-100 disabled:opacity-50"
            >
              확정된 장부 불러와서 수정
            </button>
            <button
              type="button"
              onClick={() => lock.ask((pw) => void deleteMonth(pw))}
              disabled={busy}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 disabled:opacity-50"
            >
              이 달 장부 삭제
            </button>
          </div>
        )}

        {!hasPlan ? (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
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
              hint="AI가 수입·지출 거래를 한 건씩 뽑아 예산 항목으로 분류합니다. 전월 이월금·잔액·합계 행은 제외됩니다."
              extraFields={() => ({
                kind: "ledger",
                // 이월금 항목은 AI 분류 대상에서 뺌 (실제 수입이 이월금으로 잘못 들어가지 않게)
                categories: JSON.stringify(budgetRefs.filter((r) => !isCarryoverItem(r))),
              })}
              authorize={(run) => lock.ask(run)}
              onParsed={(result, file) => {
                const parsed = result as ParsedLedger;
                setRows(
                  parsed.items.map((i) => ({
                    key: nextKey++,
                    entry_date: i.entry_date ?? "",
                    description: i.description,
                    kind: i.kind,
                    category_group: i.category_group,
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
              onClick={() =>
                lock.ask(() => {
                  setRows([newRow("expense")]);
                  setFilename(null);
                  setDetectedMonth(null);
                })
              }
              className="text-sm text-gray-600 underline"
            >
              AI 없이 직접 입력
            </button>
          </>
        )}
      </Card>

      {rows && hasPlan && (
        <Card title={`2. ${monthLabel(month)} 수입·지출 내역 확인 및 수정`}>
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
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-2 py-1.5 w-36">날짜</th>
                  <th className="text-left px-2 py-1.5 w-24">구분</th>
                  <th className="text-left px-2 py-1.5">내용</th>
                  <th className="text-left px-2 py-1.5 w-60">예산 항목</th>
                  <th className="text-right px-2 py-1.5 w-36">금액(원)</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.key}
                    className={`border-b border-gray-100 ${r.category === UNCATEGORIZED ? "bg-orange-50/60" : ""}`}
                  >
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={r.entry_date}
                        aria-label={`${i + 1}번째 날짜`}
                        onChange={(e) => updateRow(r.key, { entry_date: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={r.kind}
                        aria-label={`${i + 1}번째 구분`}
                        onChange={(e) => {
                          const kind = e.target.value as Kind;
                          const ref = firstRefOf(kind);
                          updateRow(r.key, { kind, category_group: ref.category_group, category: ref.category });
                        }}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm font-medium ${
                          r.kind === "income" ? "text-emerald-700" : "text-gray-800"
                        }`}
                      >
                        <option value="expense">{KIND_LABEL.expense}</option>
                        <option value="income">{KIND_LABEL.income}</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={r.description}
                        aria-label={`${i + 1}번째 내용`}
                        onChange={(e) => updateRow(r.key, { description: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={itemKey(r)}
                        aria-label={`${i + 1}번째 예산 항목`}
                        onChange={(e) => {
                          const ref = allRefs.find((x) => itemKey(x) === e.target.value);
                          if (ref) updateRow(r.key, { category_group: ref.category_group, category: ref.category });
                        }}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                      >
                        {!validKeys.has(itemKey(r)) && <option value={itemKey(r)}>{r.category}</option>}
                        {optionGroupsOf(r.kind).map(([group, refs]) => (
                          <optgroup key={group} label={group || "기타"}>
                            {refs.map((ref) => (
                              <option key={itemKey(ref)} value={itemKey(ref)}>
                                {ref.category}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        <option value={itemKey(uncategorizedRef(r.kind))}>{UNCATEGORIZED}</option>
                      </select>
                      {r.category_group && (
                        <div className="mt-0.5 px-1 text-[11px] text-gray-400">{r.category_group}</div>
                      )}
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
                        className="text-gray-400 hover:text-red-600 text-xs"
                        aria-label={`${i + 1}번째 행 삭제`}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-gray-400">
                      내역이 없습니다. 거래가 없는 달이면 그대로 확정해도 됩니다.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-2 py-2" colSpan={4}>
                    <button
                      type="button"
                      onClick={() => setRows([...rows, newRow("expense")])}
                      className="text-sm font-semibold text-brand-600"
                    >
                      + 행 추가
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                    <div className="font-semibold text-gray-900">지출 {won(totalOf("expense"))}</div>
                    <div className="font-semibold text-emerald-700">수입 {won(totalOf("income"))}</div>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {byGroup.length > 0 && (
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <div className="text-xs font-medium text-gray-500 mb-1">카테고리별 합계</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {byGroup.map((c) => (
                  <span
                    key={`${c.kind}:${c.group}`}
                    className={
                      c.group === UNCATEGORIZED
                        ? "text-orange-800"
                        : c.kind === "income"
                          ? "text-emerald-700"
                          : "text-gray-700"
                    }
                  >
                    [{KIND_LABEL[c.kind]}] {c.group} <span className="tabular-nums font-medium">{won(c.amount)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {alreadyConfirmed && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
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
            className="w-full sm:w-auto rounded-xl bg-brand-600 hover:bg-brand-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "저장 중..." : `${monthLabel(month)} 장부 확정`}
          </button>
        </Card>
      )}
    </div>
  );
}
