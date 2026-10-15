"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BudgetItem, BudgetPlan, LedgerEntry, LedgerMonth } from "@/lib/budget/types";
import BudgetPlanForm from "./BudgetPlanForm";
import LedgerForm from "./LedgerForm";
import { PasswordGate } from "./EditLock";

type Tab = "budget" | "ledger";

export default function BudgetUpload({
  initialTab,
  editMonth,
  editEntries,
  editFiscalYear,
  plans,
  items,
  months,
  error,
}: {
  initialTab: Tab;
  editMonth: string | null;
  editEntries: LedgerEntry[] | null;
  editFiscalYear: number | null;
  plans: BudgetPlan[];
  items: BudgetItem[];
  months: LedgerMonth[];
  error?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  // 업로드 화면은 재정 담당자만 (들어올 때마다 비밀번호 확인, 기억하지 않음)
  const [password, setPassword] = useState<string | null>(null);

  if (!password) {
    return (
      <PasswordGate
        notice="업로드 화면은 SLM HQ 재정 담당자만 들어갈 수 있습니다."
        onCancel={() => (window.history.length > 1 ? router.back() : router.push("/"))}
        onVerified={setPassword}
      />
    );
  }

  if (error) {
    return <div className="bg-white rounded-2xl p-5 text-sm text-gray-600">데이터를 불러오지 못했습니다: {error}</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
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
        <BudgetPlanForm plans={plans} items={items} editFiscalYear={editFiscalYear} password={password} />
      ) : (
        <LedgerForm
          plans={plans}
          items={items}
          months={months}
          editMonth={editMonth}
          editEntries={editEntries}
          password={password}
        />
      )}
    </div>
  );
}
