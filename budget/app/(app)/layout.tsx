import { BottomTabs, Sidebar } from "@/components/BudgetNav";
import { Logo } from "@/components/Logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-60">
        <header className="bg-white/80 backdrop-blur border-b border-gray-100 md:mx-6 md:mt-0">
          <div className="px-5 md:px-7 py-3">
            <div className="text-[11px] font-medium text-gray-600">CCC Life Transforming Communitas</div>
            <Logo />
          </div>
        </header>
        <main className="max-w-6xl px-4 md:px-7 py-5 pb-24 md:pb-10">{children}</main>
      </div>
      <BottomTabs />
    </div>
  );
}
