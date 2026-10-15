"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HomeIcon, LogoutIcon, UploadIcon } from "./Icons";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "대시보드", Icon: HomeIcon },
  { href: "/upload", label: "업로드", Icon: UploadIcon },
];

function useLogout() {
  const router = useRouter();
  return async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };
}

// 데스크톱: 왼쪽 사이드바
export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();
  return (
    <aside className="hidden md:flex fixed inset-y-3 left-3 w-56 flex-col bg-white rounded-3xl shadow-[0_1px_3px_rgba(17,24,39,0.05)]">
      <div className="px-5 pt-6 pb-6">
        <Logo />
      </div>
      <nav className="flex-1 px-3 space-y-1.5">
        {LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors ${
                active ? "bg-brand-600 text-white shadow-[0_4px_12px_rgba(122,36,245,0.25)]" : "text-gray-600 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-5">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-semibold text-gray-500 hover:bg-gray-50"
        >
          <LogoutIcon />
          로그아웃
        </button>
      </div>
    </aside>
  );
}

// 모바일: 아래쪽 탭 바
export function BottomTabs() {
  const pathname = usePathname();
  const logout = useLogout();
  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold";
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      {LINKS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={`${item} ${pathname === href ? "text-brand-600" : "text-gray-400"}`}>
          <Icon />
          {label}
        </Link>
      ))}
      <button type="button" onClick={logout} className={`${item} text-gray-400`}>
        <LogoutIcon />
        로그아웃
      </button>
    </nav>
  );
}

const TITLES: Record<string, [string, string]> = {
  "/": ["대시보드", "예산 대비 항목별 사용 현황"],
  "/upload": ["업로드", "예산안과 월별 장부를 올리고 확인한 뒤 확정해요"],
};

// 페이지 위쪽 제목
export function PageHeader() {
  const pathname = usePathname();
  const [title, desc] = TITLES[pathname] ?? ["", ""];
  return (
    <header className="px-4 md:px-0 pt-5 md:pt-7 pb-1">
      <div className="md:hidden mb-4">
        <Logo />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </header>
  );
}
