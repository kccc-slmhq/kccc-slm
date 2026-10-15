"use client";

import { useEffect, useRef, useState } from "react";
import { PasswordInput } from "./PasswordInput";

export const EDIT_NOTICE = "업로드와 확정된 자료의 수정·삭제는 SLM HQ 재정 담당자만 할 수 있습니다.";

export const EDIT_PASSWORD_HEADER = "x-edit-password";

// 서버로 보낼 비밀번호 헤더 (한글 등도 안전하게)
export const passwordHeader = (pw: string) => ({ [EDIT_PASSWORD_HEADER]: encodeURIComponent(pw) });

// 업로드·수정·삭제할 때마다 재정 담당자 비밀번호를 물어봄 (기억하지 않음)
// 단, 한 번의 작업 흐름(업로드 → 확인·수정 → 확정) 안에서는 처음 입력한 비밀번호로 확정까지 진행
// 비밀번호 검사는 서버에서만 함
// initial: 업로드 화면에 들어올 때 입력한 비밀번호 (첫 작업 흐름에 이어서 씀)
export function usePassword(initial?: string | null) {
  const held = useRef<string | null>(initial ?? null);
  const [pending, setPending] = useState<((pw: string) => void) | null>(null);

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-lock-title"
      onClick={onCancel}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        <PasswordForm onCancel={onCancel} onVerified={onVerified} />
      </div>
    </div>
  );
}

// 화면 전체를 잠그는 비밀번호 확인 (업로드 화면 들어갈 때)
export function PasswordGate({
  notice,
  onCancel,
  onVerified,
}: {
  notice: string;
  onCancel: () => void;
  onVerified: (pw: string) => void;
}) {
  return (
    <div className="grid place-items-center py-10">
      <div className="w-full max-w-sm">
        <PasswordForm notice={notice} onCancel={onCancel} onVerified={onVerified} />
      </div>
    </div>
  );
}

function PasswordForm({
  notice = EDIT_NOTICE,
  onCancel,
  onVerified,
}: {
  notice?: string;
  onCancel: () => void;
  onVerified: (pw: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-[0_8px_32px_rgba(17,24,39,0.12)]">
      <h2 id="edit-lock-title" className="text-lg font-bold text-gray-900">
        🔒 재정 담당자 확인
      </h2>
      <p className="mt-1 text-sm text-gray-600">{notice}</p>
      <label className="mt-4 mb-1.5 block text-sm font-medium text-gray-700" htmlFor="edit-password">
        비밀번호
      </label>
      <PasswordInput
        ref={inputRef}
        id="edit-password"
        autoComplete="off"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
  );
}
