"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BarsIcon, HomeIcon, ListIcon, LogoutIcon, TrendIcon, UploadIcon } from "./Icons";
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

// 모바일에서 대시보드를 나눠 보는 화면 (아래쪽 탭)
export const MOBILE_VIEWS = [
  { key: "summary", label: "요약", Icon: HomeIcon },
  { key: "category", label: "카테고리", Icon: BarsIcon },
  { key: "monthly", label: "월별", Icon: TrendIcon },
  { key: "detail", label: "내역", Icon: ListIcon },
] as const;
export type MobileView = (typeof MOBILE_VIEWS)[number]["key"];

export function useMobileView(): MobileView {
  const v = useSearchParams().get("v");
  return MOBILE_VIEWS.find((x) => x.key === v)?.key ?? "summary";
}

// 대시보드 안에서 화면 전환 (주소만 바꾸고 데이터는 다시 불러오지 않음)
export function showMobileView(v: MobileView) {
  const params = new URLSearchParams(window.location.search);
  if (v === "summary") params.delete("v");
  else params.set("v", v);
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  window.scrollTo({ top: 0 });
}

// 모바일: 아래쪽 탭 바 = 대시보드 화면들 (업로드·로그아웃은 위쪽에 작게)
export function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const current = useMobileView();
  const onDashboard = pathname === "/";
  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold";
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      {MOBILE_VIEWS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => (onDashboard ? showMobileView(key) : router.push(key === "summary" ? "/" : `/?v=${key}`))}
          aria-current={onDashboard && current === key ? "page" : undefined}
          className={`${item} ${onDashboard && current === key ? "text-brand-600" : "text-gray-400"}`}
        >
          <Icon />
          {label}
        </button>
      ))}
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
      <MobileTopBar />
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </header>
  );
}

// 모바일 위쪽: 로고 + 업로드(재정 담당자용)·로그아웃을 작게
function MobileTopBar() {
  const pathname = usePathname();
  const logout = useLogout();
  const onUpload = pathname === "/upload";
  return (
    <div className="md:hidden mb-4 flex items-center gap-2">
      <Link href="/" aria-label="대시보드">
        <Logo />
      </Link>
      <Link
        href="/upload"
        className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
          onUpload ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-gray-500 ring-gray-200"
        }`}
      >
        <UploadIcon className="h-3.5 w-3.5" />
        업로드
      </Link>
      <button
        type="button"
        onClick={logout}
        aria-label="로그아웃"
        className="grid h-7 w-7 place-items-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200"
      >
        <LogoutIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
