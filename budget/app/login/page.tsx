"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";
import { Logo } from "@/components/Logo";

// Supabase 로그인은 이메일 형식이 필요해서, 아이디만 입력하면 이 도메인을 붙여 이메일로 만듦
// (Supabase에는 "아이디@slm-budget.local" 로 사용자를 만들어 두면 됨)
const LOGIN_DOMAIN = "slm-budget.local";

function toLoginEmail(id: string): string {
  const trimmed = id.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : `${trimmed}@${LOGIN_DOMAIN}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: toLoginEmail(loginId),
      password,
    });
    setLoading(false);
    if (error) {
      setError("로그인에 실패했습니다. 아이디/비밀번호를 확인해주세요.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(safeNext(next));
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(17,24,39,0.06)] p-7 w-full max-w-sm"
      >
        <div className="text-[11px] font-medium text-gray-500">CCC Life Transforming Communitas</div>
        <h1 className="mt-0.5">
          <Logo size="lg" />
        </h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          <span className="font-bold text-brand-600">CCC</span> 예산 집행 현황 · 재정 담당자 로그인
        </p>
        <label className="block text-sm text-gray-700 font-medium mb-1.5">아이디</label>
        <input
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 mb-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <label className="block text-sm text-gray-700 font-medium mb-1.5">비밀번호</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 mb-5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
