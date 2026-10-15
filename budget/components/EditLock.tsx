"use client";

import { useEffect, useRef, useState } from "react";

export const EDIT_NOTICE = "확정된 월별 장부의 수정과 삭제는 SLM HQ 재정 담당자만 할 수 있습니다.";

// 수정·삭제 전에 재정 담당자 비밀번호를 확인. 비밀번호 검사는 서버에서만 함
export function useEditLock() {
  const [unlocked, setUnlocked] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/edit-auth")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.unlocked) setUnlocked(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 잠금이 풀려 있으면 바로 실행, 아니면 비밀번호 창을 띄우고 확인 후 실행
  function requireUnlock(action: () => void) {
    if (unlocked) action();
    else setPending(() => action);
  }

  const dialog = pending ? (
    <PasswordDialog
      onCancel={() => setPending(null)}
      onUnlocked={() => {
        setUnlocked(true);
        const action = pending;
        setPending(null);
        action();
      }}
    />
  ) : null;

  return { unlocked, requireUnlock, dialog };
}

function PasswordDialog({ onCancel, onUnlocked }: { onCancel: () => void; onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    const res = await fetch("/api/edit-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setChecking(false);
    if (res?.ok) {
      onUnlocked();
      return;
    }
    const body = await res?.json().catch(() => ({}));
    setError(body?.error ?? "비밀번호를 확인하지 못했습니다.");
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-lock-title"
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_8px_32px_rgba(17,24,39,0.12)]"
      >
        <h2 id="edit-lock-title" className="text-lg font-bold text-gray-900">
          재정 담당자 확인
        </h2>
        <p className="mt-1 text-sm text-gray-600">{EDIT_NOTICE}</p>
        <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="edit-password">
          비밀번호
        </label>
        <input
          ref={inputRef}
          id="edit-password"
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={checking || !password}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {checking ? "확인 중..." : "확인"}
          </button>
        </div>
      </form>
    </div>
  );
}
