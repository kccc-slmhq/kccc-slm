"use client";

import { useEffect, useRef, useState } from "react";

export const EDIT_NOTICE = "업로드와 확정된 자료의 수정·삭제는 SLM HQ 재정 담당자만 할 수 있습니다.";

export const EDIT_PASSWORD_HEADER = "x-edit-password";

// 서버로 보낼 비밀번호 헤더 (한글 등도 안전하게)
export const passwordHeader = (pw: string) => ({ [EDIT_PASSWORD_HEADER]: encodeURIComponent(pw) });

// 대시보드의 '수정' → 업로드 화면으로 넘어갈 때 한 번만 비밀번호를 넘겨줌 (읽으면 바로 지움)
const HANDOFF_KEY = "slm-edit-handoff";
const HANDOFF_TTL_MS = 60_000;

export function handOffPassword(target: string, pw: string) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ target, pw, at: Date.now() }));
  } catch {
    // 저장이 안 되면 다음 화면에서 다시 물어봄
  }
}

function takeHandoff(target: string): string | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const h = JSON.parse(raw);
    if (h?.target !== target) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    return typeof h.pw === "string" && Date.now() - h.at < HANDOFF_TTL_MS ? h.pw : null;
  } catch {
    return null;
  }
}

// 업로드·수정·삭제할 때마다 재정 담당자 비밀번호를 물어봄 (기억하지 않음)
// 단, 한 번의 작업 흐름(업로드 → 확인·수정 → 확정) 안에서는 처음 입력한 비밀번호로 확정까지 진행
// 비밀번호 검사는 서버에서만 함
export function usePassword(handoffTarget?: string | null) {
  const held = useRef<string | null>(null);
  const [pending, setPending] = useState<((pw: string) => void) | null>(null);

  useEffect(() => {
    const pw = handoffTarget ? takeHandoff(handoffTarget) : null;
    if (pw) held.current = pw;
  }, [handoffTarget]);

  // 비밀번호 창을 띄우고, 맞으면 action(비밀번호) 실행
  // continueFlow: 이 작업 흐름에서 이미 입력한 비밀번호가 있으면 다시 묻지 않음 (확정 단계)
  function ask(action: (pw: string) => void, opts?: { continueFlow?: boolean }) {
    if (opts?.continueFlow && held.current) {
      action(held.current);
      return;
    }
    setPending(() => action);
  }

  // 작업 흐름 끝 (확정·삭제 완료, 다른 작업 시작)
  function forget() {
    held.current = null;
  }

  const dialog = pending ? (
    <PasswordDialog
      onCancel={() => setPending(null)}
      onVerified={(pw) => {
        held.current = pw;
        const action = pending;
        setPending(null);
        action(pw);
      }}
    />
  ) : null;

  return { ask, forget, dialog };
}

function PasswordDialog({ onCancel, onVerified }: { onCancel: () => void; onVerified: (pw: string) => void }) {
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
      onVerified(password);
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
