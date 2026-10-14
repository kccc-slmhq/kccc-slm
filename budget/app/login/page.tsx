"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

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
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm"
      >
        <h1 className="text-lg font-bold">SLM 예산 집행 현황</h1>
        <p className="text-sm text-slate-500 mb-4">재정 담당자 로그인</p>
        <label className="block text-sm text-slate-600 mb-1">아이디</label>
        <input
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mb-3 text-sm"
        />
        <label className="block text-sm text-slate-600 mb-1">비밀번호</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mb-4 text-sm"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-800 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
