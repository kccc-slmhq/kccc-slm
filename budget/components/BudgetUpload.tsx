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
    return <div className="bg-white rounded-2xl p-5 text-sm text-gray-600">데이터를 불러오지 못했습니다: {error}</div>;
  }

  return (
    <div className="space-y-6">
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
            className={`flex-1 sm:flex-none rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-brand-50 text-brand-600 border-brand-100"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
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
