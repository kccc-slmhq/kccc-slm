import type { Metadata } from "next";
import BudgetNav from "@/components/budget/BudgetNav";

export const metadata: Metadata = {
  title: "SLM 예산 집행 현황",
  description: "예산안 대비 항목별 집행 현황",
};

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 whitespace-nowrap">SLM 예산 집행 현황</h1>
          <BudgetNav />
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}
