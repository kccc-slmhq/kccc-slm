"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { fiscalYearLabel } from "@/lib/budget/fiscal";
import { won } from "@/lib/budget/summary";
import type { BudgetItem, BudgetPlan } from "@/lib/budget/types";
import { KIND_LABEL, isCarryoverItem, kindOf, type Kind } from "@/lib/budget/types";
import { handOffPassword, usePassword } from "./EditLock";

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
  error,
}: {
  fiscalYear: number;
  plans: BudgetPlan[];
  items: BudgetItem[];
  error?: string;
}) {
  const router = useRouter();
  const lock = usePassword();
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
        {plan && (
          <button
            type="button"
            onClick={openEditor}
            className="ml-auto rounded-full px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
          >
            🔒 예산안 수정
          </button>
        )}
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
                              {r.one_time && <Badge>일회성</Badge>}
                              {isCarryoverItem(r) && <Badge>이월금 · 달성률 제외</Badge>}
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

          <p className="px-1 text-xs text-gray-400">
            {plan.source_filename ? `원본 파일: ${plan.source_filename} · ` : ""}확정일{" "}
            {new Date(plan.confirmed_at).toLocaleDateString("ko-KR")}
          </p>
        </>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 whitespace-nowrap rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
      {children}
    </span>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 text-center text-sm text-gray-600 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      {children}
    </div>
  );
}
