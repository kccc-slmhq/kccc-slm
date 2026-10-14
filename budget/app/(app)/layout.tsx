import BudgetNav from "@/components/BudgetNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 whitespace-nowrap">SLM 예산 집행 현황</h1>
          <BudgetNav />
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </>
  );
}
