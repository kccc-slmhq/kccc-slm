"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fiscalYearLabel } from "@/lib/budget/fiscal";
import { won } from "@/lib/budget/summary";
import type { BudgetItem, BudgetPlan, BudgetTransfer } from "@/lib/budget/types";
import { KIND_LABEL, isCarryoverItem, kindOf, type Kind } from "@/lib/budget/types";
import { handOffPassword, usePassword } from "./EditLock";
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
  const plan = plans.find((p) => p.fiscal_year === fiscalYear);
  const fyItems = items.filter((i) => i.fiscal_year === fiscalYear).sort((a, b) => a.sort_order - b.sort_order);

  function openEditor() {
    lock.ask((pw) => {
      lock.forget();
      handOffPassword(`budget:${fiscalYear}`, pw);
      router.push(`/upload?tab=budget&edit=${fiscalYear}`);
    });
  }

  if (error) return <Notice>데이터를 불러오지 못했습니다: {error}</Notice>;

  return (
    <div className="max-w-4xl space-y-6">
      {lock.dialog}
      {transferPassword && (
        <TransferDialog
          fiscalYear={fiscalYear}
          items={fyItems.filter((i) => kindOf(i) === "expense")}
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
        {plan && (
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
          <section className="grid grid-cols-2 gap-3">
            {KINDS.map((kind) => {
              const total = fyItems
                .filter((i) => kindOf(i) === kind && !isCarryoverItem(i))
                .reduce((sum, i) => sum + i.amount, 0);
              return (
                <div key={kind} className="min-w-0 rounded-2xl bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
                  <div className="text-xs text-gray-500">{KIND_LABEL[kind]} 예산 합계</div>
                  <div
                    className={`whitespace-nowrap font-bold tabular-nums text-[clamp(1rem,4.6vw,1.5rem)] md:text-2xl ${
                      kind === "income" ? "text-emerald-700" : "text-gray-900"
                    }`}
                  >
                    {won(total)}
                  </div>
                </div>
              );
            })}
          </section>

          {KINDS.map((kind) => {
            const kindItems = fyItems.filter((i) => kindOf(i) === kind);
            if (kindItems.length === 0) return null;
            const total = kindItems.filter((i) => !isCarryoverItem(i)).reduce((sum, i) => sum + i.amount, 0);
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
                        {rows.map((r) => (
                          <li key={r.id} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                            <span className="min-w-0 text-gray-700">
                              {r.category}
                            </span>
                            <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-gray-900">
                              {won(r.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {transfersReady && (
            <section>
              <h2 className="mb-2 flex flex-col gap-0.5 px-1 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="text-[15px] font-bold text-gray-900">용도변경 내역</span>
                <span className="text-xs text-gray-500">{TRANSFER_KEEP_NOTICE}</span>
              </h2>
              <div className="rounded-2xl bg-white px-4 py-1 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
                <TransferHistory transfers={transfers} />
              </div>
            </section>
          )}

          <p className="px-1 text-xs text-gray-400">
            {plan.source_filename ? `원본 파일: ${plan.source_filename} · ` : ""}확정일{" "}
            {new Date(plan.confirmed_at).toLocaleDateString("ko-KR")}
          </p>
        </>
      )}
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
