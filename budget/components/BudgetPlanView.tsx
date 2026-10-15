"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUDGET_EDIT_CLOSED, budgetEditDeadline, canEditBudget, fiscalYearLabel } from "@/lib/budget/fiscal";
import { shortWon, won } from "@/lib/budget/summary";
import type { BudgetItem, BudgetPlan, BudgetTransfer } from "@/lib/budget/types";
import { KIND_LABEL, isCarryoverItem, kindOf, type Kind } from "@/lib/budget/types";
import { usePassword } from "./EditLock";
import { TRANSFER_KEEP_NOTICE, TransferDialog, TransferHistory } from "./BudgetTransfer";

const KINDS: Kind[] = ["expense", "income"];

// 큰 카테고리별로 묶음 (예산안 순서 유지)
function groupsOf(items: BudgetItem[]) {
  const map = new Map<string, BudgetItem[]>();
  for (const i of items) {
    if (!map.has(i.category_group)) map.set(i.category_group, []);
    map.get(i.category_group)!.push(i);
  }
  return [...map.entries()].map(([group, rows]) => ({
    group,
    rows,
    total: rows.reduce((sum, r) => sum + r.amount, 0),
  }));
}

export default function BudgetPlanView({
  fiscalYear,
  plans,
  items,
  transfers,
  transfersReady,
  error,
}: {
  fiscalYear: number;
  plans: BudgetPlan[];
  items: BudgetItem[];
  transfers: BudgetTransfer[];
  transfersReady: boolean; // 용도변경 표(SQL)가 준비되었는지
  error?: string;
}) {
  const router = useRouter();
  const lock = usePassword();
  // 용도변경 창에 넘길 비밀번호 (창을 열 때 한 번 확인)
  const [transferPassword, setTransferPassword] = useState<string | null>(null);
  const [view, setView] = useState<PlanView>("items");
  const plan = plans.find((p) => p.fiscal_year === fiscalYear);
  const fyItems = items.filter((i) => i.fiscal_year === fiscalYear).sort((a, b) => a.sort_order - b.sort_order);

  // 업로드 화면에서 재정 담당자 비밀번호를 확인함
  function openEditor() {
    router.push(`/upload?tab=budget&edit=${fiscalYear}`);
  }

  if (error) return <Notice>데이터를 불러오지 못했습니다: {error}</Notice>;

  const expenseItems = fyItems.filter((i) => kindOf(i) === "expense");
  const editable = canEditBudget(fiscalYear);
  // 항목별 용도변경 기록 (받은 것 +, 보낸 것 −)
  const changesOf = new Map<string, { sign: 1 | -1; t: BudgetTransfer }[]>();
  for (const t of [...transfers].reverse()) {
    for (const [group, category, sign] of [
      [t.from_group, t.from_category, -1],
      [t.to_group, t.to_category, 1],
    ] as const) {
      const k = `${group}\u241E${category}`;
      if (!changesOf.has(k)) changesOf.set(k, []);
      changesOf.get(k)!.push({ sign, t });
    }
  }
  const totalOf = (kind: Kind) =>
    fyItems.filter((i) => kindOf(i) === kind && !isCarryoverItem(i)).reduce((sum, i) => sum + i.amount, 0);
  const expenseTotal = totalOf("expense");
  const incomeTotal = totalOf("income");
  // 모바일에서는 화면을 나눠서 (데스크톱은 전부 표시)
  const only = (v: PlanView) => (view === v ? "" : "hidden md:block");

  return (
    <div className="space-y-6">
      {lock.dialog}
      {transferPassword && (
        <TransferDialog
          fiscalYear={fiscalYear}
          items={expenseItems}
          password={transferPassword}
          onClose={() => setTransferPassword(null)}
          onDone={() => {
            setTransferPassword(null);
            router.refresh();
            window.alert(`용도변경을 반영했습니다.\n${TRANSFER_KEEP_NOTICE}`);
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {plans.length > 0 && (
          <select
            value={fiscalYear}
            onChange={(e) => router.push(`/plan?fy=${e.target.value}`)}
            className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm"
            aria-label="회기 선택"
          >
            {plans.map((p) => (
              <option key={p.fiscal_year} value={p.fiscal_year}>
                {fiscalYearLabel(p.fiscal_year)}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto flex gap-1">
          {plan && transfersReady && (
            <button
              type="button"
              onClick={() =>
                lock.ask((pw) => {
                  lock.forget();
                  setTransferPassword(pw);
                })
              }
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              🔒 용도변경
            </button>
          )}
          {plan && editable && (
            <button
              type="button"
              onClick={openEditor}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              🔒 예산안 수정
            </button>
          )}
        </span>
      </div>
      {plan && (
        <p
          className={`-mt-3 px-1 text-xs ${editable ? "text-gray-500" : "rounded-xl bg-amber-50 px-3 py-2 text-amber-800"}`}
        >
          {editable
            ? `예산안 수정은 ${budgetEditDeadline(fiscalYear)}까지 할 수 있습니다. 이후 변경은 회의를 거쳐 용도변경으로 해주세요.`
            : BUDGET_EDIT_CLOSED}
        </p>
      )}

      {!plan ? (
        <Notice>
          확정된 예산안이 없습니다.{" "}
          <Link href="/upload" className="underline font-medium">
            예산안 업로드
          </Link>
          부터 진행해주세요.
        </Notice>
      ) : (
        <>
          {/* 모바일: 화면 나누기 */}
          <div className="md:hidden flex gap-1 rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(17,24,39,0.04)]" role="tablist">
            {PLAN_VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={view === v.key}
                onClick={() => setView(v.key)}
                className={`flex-1 rounded-full py-2 text-sm font-semibold ${
                  view === v.key ? "bg-brand-600 text-white" : "text-gray-500"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6 xl:items-start space-y-6 xl:space-y-0">
            {/* 왼쪽: 합계 + 항목 */}
            <div className={`min-w-0 space-y-6 ${only("items")}`}>
              <section className="grid grid-cols-2 gap-3">
                {KINDS.map((kind) => (
                  <div key={kind} className="min-w-0 rounded-2xl bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
                    <div className="text-xs text-gray-500">{KIND_LABEL[kind]} 예산 합계</div>
                    <div
                      className={`whitespace-nowrap font-bold tabular-nums text-[clamp(1rem,4.6vw,1.5rem)] md:text-2xl ${
                        kind === "income" ? "text-emerald-700" : "text-gray-900"
                      }`}
                    >
                      {won(kind === "income" ? incomeTotal : expenseTotal)}
                    </div>
                  </div>
                ))}
              </section>

              {KINDS.map((kind) => {
                const kindItems = fyItems.filter((i) => kindOf(i) === kind);
                if (kindItems.length === 0) return null;
                const total = kind === "income" ? incomeTotal : expenseTotal;
                return (
                  <section key={kind}>
                    <h2 className="mb-2 flex items-center gap-2 px-1 text-[15px] font-bold text-gray-900">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs ${
                          kind === "income" ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"
                        }`}
                      >
                        {KIND_LABEL[kind]}
                      </span>
                      {KIND_LABEL[kind]} 예산
                    </h2>
                    <div className="space-y-3">
                      {groupsOf(kindItems).map(({ group, rows, total: subtotal }) => (
                        <div key={group} className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
                          <div className="flex items-baseline gap-2 bg-brand-50/50 px-4 py-2.5">
                            <span className="min-w-0 font-bold text-gray-900">{group || "기타"}</span>
                            <span className="text-xs text-gray-400">{rows.length}</span>
                            <span className="ml-auto whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900">
                              {won(subtotal)}
                            </span>
                            {total > 0 && !rows.every(isCarryoverItem) && (
                              <span className="w-11 text-right text-xs tabular-nums text-gray-400">
                                {Math.round((subtotal / total) * 100)}%
                              </span>
                            )}
                          </div>
                          <ul className="divide-y divide-gray-100">
                            {rows.map((r) => {
                              const changes = kind === "expense" ? (changesOf.get(`${r.category_group}\u241E${r.category}`) ?? []) : [];
                              const net = changes.reduce((sum, c) => sum + c.sign * c.t.amount, 0);
                              return (
                                <li key={r.id} className="px-4 py-2 text-sm">
                                  <div className="flex items-baseline gap-3">
                                    <span className="min-w-0 text-gray-700">{r.category}</span>
                                    <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-gray-900">
                                      {won(r.amount)}
                                    </span>
                                  </div>
                                  {changes.length > 0 && (
                                    <div className="mt-1 space-y-0.5 rounded-lg bg-brand-50/50 px-2.5 py-1.5 text-xs text-gray-600">
                                      <div className="tabular-nums text-gray-500">
                                        용도변경 전 {won(r.amount - net)}
                                      </div>
                                      {changes.map(({ sign, t }) => (
                                        <div key={`${t.id}:${sign}`}>
                                          <span className={`font-semibold tabular-nums ${sign > 0 ? "text-brand-700" : "text-gray-700"}`}>
                                            {sign > 0 ? "+" : "−"}
                                            {won(t.amount)}
                                          </span>{" "}
                                          {t.meeting_date} 회의 · {sign > 0 ? `${t.from_category}에서` : `${t.to_category}(으)로`}
                                          {t.reason ? ` · ${t.reason}` : ""}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              <p className="px-1 text-xs text-gray-400">
                {plan.source_filename ? `원본 파일: ${plan.source_filename} · ` : ""}확정일{" "}
                {new Date(plan.confirmed_at).toLocaleDateString("ko-KR")}
              </p>
            </div>

            {/* 오른쪽: 예산 구성 · 큰 항목 · 용도변경 */}
            <aside className="space-y-4 xl:sticky xl:top-6" aria-label="예산 한눈에 보기">
              <div className={`space-y-4 ${only("overview")}`}>
                <SideCard title="예산 구성">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Figure label="수입 예산" value={shortWon(incomeTotal)} tone="text-emerald-700" />
                    <Figure label="지출 예산" value={shortWon(expenseTotal)} />
                    <Figure
                      label="차액"
                      value={`${incomeTotal - expenseTotal < 0 ? "−" : "+"}${shortWon(Math.abs(incomeTotal - expenseTotal))}`}
                      tone={incomeTotal - expenseTotal < 0 ? "text-red-700" : "text-gray-900"}
                    />
                  </div>
                  <div className="space-y-2.5 pt-2">
                    {groupsOf(expenseItems)
                      .sort((a, b) => b.total - a.total)
                      .map(({ group, total }) => (
                        <ShareBar key={group} label={group || "기타"} amount={total} ratio={expenseTotal > 0 ? total / expenseTotal : 0} />
                      ))}
                  </div>
                </SideCard>

                <SideCard title="규모가 큰 항목 TOP 5">
                  <ul className="space-y-2.5">
                    {[...expenseItems]
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 5)
                      .map((r, idx) => (
                        <li key={r.id} className="flex items-baseline gap-2 text-sm">
                          <span className="w-4 shrink-0 font-semibold text-brand-600">{idx + 1}</span>
                          <span className="min-w-0 text-gray-800">
                            {r.category}
                            <span className="ml-1 text-xs text-gray-400">{r.category_group}</span>
                          </span>
                          <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-gray-900">{shortWon(r.amount)}</span>
                        </li>
                      ))}
                  </ul>
                </SideCard>
              </div>

              {transfersReady && (
                <div className={only("transfers")}>
                  <SideCard title="용도변경 내역">
                    <p className="text-xs text-gray-500">
                      {transfers.length > 0
                        ? `${transfers.length}건 · 총 ${won(transfers.reduce((sum, t) => sum + t.amount, 0))} 이동`
                        : "아직 용도변경이 없습니다."}
                    </p>
                    {transfers.length > 0 && <TransferHistory transfers={transfers} />}
                    <p className="rounded-xl bg-brand-50/60 px-3 py-2 text-xs text-brand-700">📁 {TRANSFER_KEEP_NOTICE}</p>
                  </SideCard>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

type PlanView = "items" | "overview" | "transfers";
const PLAN_VIEWS: { key: PlanView; label: string }[] = [
  { key: "items", label: "항목" },
  { key: "overview", label: "구성" },
  { key: "transfers", label: "용도변경" },
];

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-gray-50 px-2 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`whitespace-nowrap text-sm font-bold tabular-nums ${tone ?? "text-gray-900"}`}>{value}</div>
    </div>
  );
}

function ShareBar({ label, amount, ratio }: { label: string; amount: number; ratio: number }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 text-sm">
        <span className="min-w-0 text-gray-800">{label}</span>
        <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-gray-900">{shortWon(amount)}</span>
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-gray-400">{Math.round(ratio * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 text-center text-sm text-gray-600 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      {children}
    </div>
  );
}
