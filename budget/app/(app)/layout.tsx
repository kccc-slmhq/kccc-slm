import { Suspense } from "react";
import { BottomTabs, PageHeader, Sidebar } from "@/components/BudgetNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-[15.5rem] md:pr-6">
        <div className="max-w-[1680px]">
          <PageHeader />
          <main className="px-4 md:px-0 py-5 pb-24 md:pb-10">{children}</main>
        </div>
      </div>
      <Suspense fallback={null}>
        <BottomTabs />
      </Suspense>
    </div>
  );
}
