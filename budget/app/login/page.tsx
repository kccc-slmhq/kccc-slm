"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";

// Supabase 로그인은 이메일 형식이 필요해서, 아이디만 입력하면 이 도메인을 붙여 이메일로 만듦
// (Supabase에는 "아이디@slm-budget.local" 로 사용자를 만들어 두면 됨)
const LOGIN_DOMAIN = "slm-budget.local";

function toLoginEmail(id: string): string {
  const trimmed = id.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : `${trimmed}@${LOGIN_DOMAIN}`;
}

// 실패 이유를 구분해서 안내 (비밀번호 틀림 / 너무 많이 시도 / 인터넷 연결)
function loginErrorMessage(error: { message?: string; status?: number; code?: string }): string {
  const msg = (error.message ?? "").toLowerCase();
  if (error.status === 429 || error.code === "over_request_rate_limit" || msg.includes("rate limit") || msg.includes("too many")) {
    return "로그인 시도가 너무 많아 잠시 막혔습니다. 5~10분 뒤에 다시 시도해주세요.";
  }
  if (error.code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "아이디 또는 비밀번호가 맞지 않습니다. 눈 버튼을 눌러 대문자·띄어쓰기 없이 입력됐는지 확인해주세요.";
  }
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("load failed")) {
    return "서버에 연결하지 못했습니다. 인터넷 연결을 확인하거나, 카카오톡 등 앱 안 브라우저라면 크롬·사파리로 열어주세요.";
  }
  return `로그인에 실패했습니다. (${error.message ?? "알 수 없는 오류"})`;
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
    // 휴대폰 자판이 붙이는 앞뒤 공백은 빼고 보냄
    const { error } = await supabase.auth
      .signInWithPassword({ email: toLoginEmail(loginId), password: password.trim() })
      .catch((err: unknown) => ({ error: err instanceof Error ? err : new Error(String(err)) }));
    setLoading(false);
    if (error) {
      setError(loginErrorMessage(error));
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
        <Logo size="lg" />
        <p className="text-sm text-gray-500 mt-5 mb-6">재정 담당자 로그인</p>
        <label className="block text-sm text-gray-700 font-medium mb-1.5">아이디</label>
        <input
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 mb-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <label className="block text-sm text-gray-700 font-medium mb-1.5">비밀번호</label>
        <div className="mb-5">
          <PasswordInput
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
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
