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
      className={`w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-right tabular-nums ${className ?? ""}`}
    />
  );
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
      const res = await fetch("/api/budget/parse", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "문서 분석에 실패했습니다.");
      onParsed(body, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700">{label}</div>
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
          className="flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <button
          type="button"
          onClick={analyze}
          disabled={!file || disabled || loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "AI 분석 중... (최대 1분)" : "AI로 항목 분석"}
        </button>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
      {children}
    </section>
  );
}
