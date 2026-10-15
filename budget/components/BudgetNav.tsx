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
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-gray-100">
      <div className="px-6 pt-7 pb-5 border-b border-gray-100 mx-3">
        <Logo />
        <div className="mt-1 text-xs text-gray-500">
          <span className="font-bold text-brand-600 tracking-wide">CCC</span> 예산 집행 현황
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors ${
                active ? "bg-brand-50 text-brand-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span
                className={`grid place-items-center w-8 h-8 rounded-lg ${
                  active ? "bg-white text-brand-600 shadow-sm" : "text-gray-500"
                }`}
              >
                <Icon />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-5">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-gray-500 hover:bg-gray-50"
        >
          <span className="grid place-items-center w-8 h-8">
            <LogoutIcon />
          </span>
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
