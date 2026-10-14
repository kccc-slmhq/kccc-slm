"use client";

import { useState } from "react";
import type { BudgetItem, BudgetPlan, LedgerMonth } from "@/lib/budget/types";
import BudgetPlanForm from "./BudgetPlanForm";
import LedgerForm from "./LedgerForm";

type Tab = "budget" | "ledger";

export default function BudgetUpload({
  initialTab,
  plans,
  items,
  months,
  error,
}: {
  initialTab: Tab;
  plans: BudgetPlan[];
  items: BudgetItem[];
  months: LedgerMonth[];
  error?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  if (error) {
    return <div className="bg-white rounded-2xl shadow-sm p-4 text-sm text-slate-600">데이터를 불러오지 못했습니다: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="tablist">
        {(
          [
            ["budget", "예산안 업로드"],
            ["ledger", "월별 장부 업로드"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none rounded-lg border px-4 py-2 text-sm font-medium ${
              tab === key ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "budget" ? (
        <BudgetPlanForm plans={plans} items={items} />
      ) : (
        <LedgerForm plans={plans} items={items} months={months} />
      )}
    </div>
  );
}
