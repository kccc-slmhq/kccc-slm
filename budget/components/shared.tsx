"use client";

import { useRef, useState } from "react";
import { MAX_UPLOAD_BYTES, UPLOAD_ACCEPT } from "@/lib/budget/upload";

// 원 단위 금액 입력 (쉼표 자동 표시)
export function AmountInput({
  value,
  onChange,
  className,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      inputMode="numeric"
      aria-label={ariaLabel}
      value={value ? value.toLocaleString("ko-KR") : ""}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
      className={`w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right tabular-nums ${className ?? ""}`}
    />
  );
}

// 서버가 안내 문구 없이 실패했을 때 (시간 초과, 요청 크기 초과 등)
function failureMessage(status: number): string {
  if (status === 504 || status === 408) {
    return "AI 분석이 너무 오래 걸려 중단되었습니다. AI 서버가 혼잡할 수 있으니 1~2분 뒤에 다시 시도해주세요.";
  }
  if (status === 413) return "파일이 너무 큽니다. 4MB 이하로 올려주세요.";
  if (status === 401) return "로그인이 만료되었습니다. 새로고침 후 다시 로그인해주세요.";
  return `문서 분석에 실패했습니다. 잠시 후 다시 시도해주세요. (오류 코드 ${status})`;
}

// 파일 선택 + AI 분석 요청
export function AnalyzeFile({
  label,
  hint,
  disabled,
  extraFields,
  onParsed,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  extraFields?: () => Record<string, string>;
  onParsed: (result: unknown, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("파일이 너무 큽니다. 4MB 이하로 올려주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      for (const [k, v] of Object.entries(extraFields?.() ?? {})) form.set(k, v);
      const res = await fetch("/api/parse", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? failureMessage(res.status));
      onParsed(body, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          disabled={disabled || loading}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
          className="flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <button
          type="button"
          onClick={analyze}
          disabled={!file || disabled || loading}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "AI 분석 중... (최대 2~3분)" : "AI로 항목 분석"}
        </button>
      </div>
      <p className="text-xs text-gray-500">{hint}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="text-[15px] font-bold text-gray-900 mb-2 px-1">{title}</h2>}
      <div className="bg-white rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_rgba(17,24,39,0.04)]">{children}</div>
    </section>
  );
}
